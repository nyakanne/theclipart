"""
Regulator Ready-Pack generator
Produces timestamped PDF / JSON / CSV artefacts with SHA-256 content hashes
suitable for FTC / DPA filing.
"""
from __future__ import annotations
import hashlib
import io
import json
import csv
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Literal

import boto3
from botocore.exceptions import BotoCoreError, ClientError, NoCredentialsError, ParamValidationError, PartialCredentialsError
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.units import mm

from app.core.config import get_settings
from app.services.model_fingerprint import fingerprint_audit

settings = get_settings()
Format = Literal['pdf', 'json', 'csv']
logger = logging.getLogger(__name__)


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _s3_upload(key: str, data: bytes, content_type: str) -> str:
    s3 = boto3.client('s3', region_name=settings.AWS_REGION)
    put_kwargs = dict(
        Bucket=settings.S3_BUCKET,
        Key=key,
        Body=data,
        ContentType=content_type,
        Expires=datetime.now(timezone.utc) + timedelta(days=7),
    )
    if settings.KMS_KEY_ID:
        put_kwargs['ServerSideEncryption'] = 'aws:kms'
        put_kwargs['SSEKMSKeyId'] = settings.KMS_KEY_ID
    s3.put_object(**put_kwargs)
    url = s3.generate_presigned_url(
        'get_object',
        Params={'Bucket': settings.S3_BUCKET, 'Key': key},
        ExpiresIn=604800,
    )
    return url


def _local_report_path(key: str) -> Path:
    base = Path(settings.REPORT_STORAGE_DIR).resolve()
    path = (base / key).resolve()
    if base not in path.parents and path != base:
        raise ValueError('Invalid report storage key.')
    return path


def _store_local_report(key: str, data: bytes) -> str:
    path = _local_report_path(key)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return key


def _build_pdf(scan_id: str, data: dict) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=20, textColor=colors.HexColor('#ef233c'))
    mono = ParagraphStyle('Mono', parent=styles['Normal'], fontName='Courier', fontSize=8)

    story = [
        Paragraph('Vindica — Regulator Ready-Pack', title_style),
        Spacer(1, 6 * mm),
        Paragraph(f'Scan ID: {scan_id}', mono),
        Paragraph(f'Generated: {datetime.now(timezone.utc).isoformat()}Z', mono),
        Paragraph(f'SHA-256 (payload): {data["payload_hash"]}', mono),
        Spacer(1, 8 * mm),
    ]

    if data.get('breaches'):
        story.append(Paragraph('Breach Records', styles['Heading2']))
        table_data = [['Source', 'Severity', 'Date', 'Exposed Fields']]
        for b in data['breaches']:
            table_data.append([
                b['source'],
                b['severity'].upper(),
                b.get('breach_date', '—'),
                ', '.join(b.get('exposed_fields', [])),
            ])
        t = Table(table_data, repeatRows=1)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#7f1018')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#374151')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#111827'), colors.HexColor('#1f2937')]),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#d1d5db')),
        ]))
        story += [t, Spacer(1, 6 * mm)]

    if data.get('evidence_items'):
        story.append(Paragraph('Evidence Links', styles['Heading2']))
        evidence_rows = [['Title', 'Source', 'Captured', 'Link']]
        for item in data['evidence_items'][:12]:
            evidence_rows.append([
                item.get('title', 'Evidence item'),
                item.get('source_name', 'Unknown source'),
                item.get('captured_at', '—'),
                item.get('source_url', '—'),
            ])
        evidence_table = Table(evidence_rows, repeatRows=1)
        evidence_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#7f1018')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTSIZE', (0, 0), (-1, -1), 7),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#374151')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#111827'), colors.HexColor('#1f2937')]),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#d1d5db')),
        ]))
        story += [evidence_table, Spacer(1, 6 * mm)]

    if data.get('fingerprint'):
        story.append(Paragraph('Model-Fingerprint Audit', styles['Heading2']))
        for f in data['fingerprint']['findings']:
            story.append(Paragraph(
                f"<b>{f['broker_name']}</b> — {', '.join(f['propensity_fields'])} — Risk: {f['risk'].upper()}",
                styles['Normal']
            ))
        story.append(Spacer(1, 4 * mm))

    story.append(Paragraph(
        'This document was generated automatically by Vindica and may be submitted '
        'to the FTC (ftccomplaintassistant.gov), ICO (ico.org.uk), or your national DPA as evidence.',
        styles['Italic']
    ))

    doc.build(story)
    return buf.getvalue()


def generate_report(scan_id: str, scan_data: dict, fmt: Format = 'pdf') -> dict:
    now = datetime.now(timezone.utc)
    payload = json.dumps(scan_data, default=str).encode()
    payload_hash = _sha256(payload)
    scan_data['payload_hash'] = payload_hash
    scan_data['fingerprint'] = fingerprint_audit(scan_data.get('broker_listings', []))

    if fmt == 'pdf':
        data = _build_pdf(scan_id, scan_data)
        ct = 'application/pdf'
        key = f'reports/{scan_id}/{now.timestamp():.0f}.pdf'
    elif fmt == 'json':
        data = json.dumps(scan_data, indent=2, default=str).encode()
        ct = 'application/json'
        key = f'reports/{scan_id}/{now.timestamp():.0f}.json'
    else:
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=['scan_id', 'evidence_kind', 'title', 'source_name', 'source_url', 'risk_level', 'captured_at', 'exposed_fields'])
        writer.writeheader()
        for item in scan_data.get('evidence_items', []):
            writer.writerow({
                'scan_id': scan_id,
                'evidence_kind': item.get('kind'),
                'title': item.get('title'),
                'source_name': item.get('source_name'),
                'source_url': item.get('source_url'),
                'risk_level': item.get('risk_level'),
                'captured_at': item.get('captured_at'),
                'exposed_fields': '|'.join(item.get('exposed_fields', [])),
            })
        data = buf.getvalue().encode()
        ct = 'text/csv'
        key = f'reports/{scan_id}/{now.timestamp():.0f}.csv'

    result = {
        'scan_id': scan_id,
        'generated_at': now,
        'format': fmt,
        'includes_dsar': True,
        'includes_compliance': True,
        'expires_at': now + timedelta(days=7),
        'filename': key.rsplit('/', 1)[-1],
        'content_type': ct,
    }
    try:
        url = _s3_upload(key, data, ct)
        return {
            **result,
            'download_url': url,
            'storage_kind': 's3',
            'storage_key': key,
        }
    except (BotoCoreError, ClientError, NoCredentialsError, PartialCredentialsError, ParamValidationError, OSError, ValueError) as exc:
        logger.warning('S3 report upload failed for %s, falling back to local storage: %s', scan_id, exc)
        local_key = _store_local_report(key, data)
        return {
            **result,
            'download_url': None,
            'storage_kind': 'local',
            'storage_key': local_key,
        }
