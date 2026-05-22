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
from datetime import datetime, timezone, timedelta
from typing import Literal

import boto3
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.units import mm

from app.core.config import get_settings
from app.services.breach_checker import to_evidence_row
from app.services.model_fingerprint import fingerprint_audit

settings = get_settings()
Format = Literal['pdf', 'json', 'csv']


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _s3_upload(key: str, data: bytes, content_type: str) -> str:
    s3 = boto3.client('s3', region_name=settings.AWS_REGION)
    s3.put_object(
        Bucket=settings.S3_BUCKET,
        Key=key,
        Body=data,
        ContentType=content_type,
        ServerSideEncryption='aws:kms',
        SSEKMSKeyId=settings.KMS_KEY_ID or None,
        Expires=datetime.now(timezone.utc) + timedelta(days=7),
    )
    url = s3.generate_presigned_url(
        'get_object',
        Params={'Bucket': settings.S3_BUCKET, 'Key': key},
        ExpiresIn=604800,
    )
    return url


def _build_pdf(scan_id: str, data: dict) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=20, textColor=colors.HexColor('#1a4fff'))
    mono = ParagraphStyle('Mono', parent=styles['Normal'], fontName='Courier', fontSize=8)

    story = [
        Paragraph('DataGuard — Regulator Ready-Pack', title_style),
        Spacer(1, 6 * mm),
        Paragraph(f'Scan ID: {scan_id}', mono),
        Paragraph(f'Generated: {datetime.now(timezone.utc).isoformat()}Z', mono),
        Paragraph(f'SHA-256 (payload): {data["payload_hash"]}', mono),
        Spacer(1, 8 * mm),
    ]

    if data.get('breaches'):
        story.append(Paragraph('Breach Records', styles['Heading2']))
        table_data = [['Source', 'Severity', 'Date', 'Exposed Fields', 'Action Required']]
        for b in data['breaches']:
            ev = to_evidence_row(b)
            table_data.append([
                b['source'],
                b.get('severity', '—').upper(),
                b.get('breach_date', '—'),
                ', '.join(b.get('exposed_fields', [])),
                ev['action_label'],
            ])
        t = Table(table_data, repeatRows=1, colWidths=[40*mm, 20*mm, 22*mm, 50*mm, 55*mm])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#001880')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTSIZE', (0, 0), (-1, -1), 7),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#374151')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#111827'), colors.HexColor('#1f2937')]),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#d1d5db')),
        ]))
        story += [t, Spacer(1, 6 * mm)]

    if data.get('hibp_status'):
        story.append(Paragraph(f'HIBP Provider Status: {data["hibp_status"].upper()}', styles['Normal']))

    if data.get('fingerprint'):
        story.append(Paragraph('Model-Fingerprint Audit', styles['Heading2']))
        for f in data['fingerprint']['findings']:
            story.append(Paragraph(
                f"<b>{f['broker_name']}</b> — {', '.join(f['propensity_fields'])} — Risk: {f['risk'].upper()}",
                styles['Normal']
            ))
        story.append(Spacer(1, 4 * mm))

    story.append(Paragraph(
        'This document was generated automatically by DataGuard and may be submitted '
        'to the FTC (ftccomplaintassistant.gov), ICO (ico.org.uk), or your national DPA as evidence.',
        styles['Italic']
    ))

    doc.build(story)
    return buf.getvalue()


def generate_report(scan_id: str, scan_data: dict, fmt: Format = 'pdf') -> dict:
    now = datetime.now(timezone.utc)

    # Attach normalized HIBP evidence rows so all formats carry the same data
    breaches = scan_data.get('breaches', [])
    scan_data['hibp_evidence'] = [to_evidence_row(b) for b in breaches]

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
        fieldnames = ['scan_id', 'source_name', 'risk_level', 'captured_at', 'exposed_fields', 'source_url', 'action_label', 'detail']
        writer = csv.DictWriter(buf, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        for ev in scan_data.get('hibp_evidence', []):
            writer.writerow({
                'scan_id': scan_id,
                **ev,
                'exposed_fields': '|'.join(ev.get('exposed_fields', [])),
            })
        data = buf.getvalue().encode()
        ct = 'text/csv'
        key = f'reports/{scan_id}/{now.timestamp():.0f}.csv'

    url = _s3_upload(key, data, ct)
    return {
        'scan_id': scan_id,
        'generated_at': now,
        'download_url': url,
        'format': fmt,
        'includes_dsar': True,
        'includes_compliance': True,
        'expires_at': now + timedelta(days=7),
    }
