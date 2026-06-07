import json
import logging
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user_id
from app.core.database import get_db
from app.core.security import encrypt_pii, generate_scan_id
from app.models.scan import Scan, BreachRecord, BrokerListing, HoneyToken, HoneyTokenHit, DsarRequest, ComplianceResult, CommandAction
from app.schemas.scan import ScanRequest, ScanJobOut, ScanResultOut, DsarRequestOut, ReportJobOut, OptOutConfirmIn, OptOutQueueOut, ManualEvidenceIn, EvidenceItemOut
from app.workers.tasks import execute_scan, run_scan, send_dsar, generate_report, generate_report_for_action
from app.core.config import get_settings
from app.core.security import decrypt_pii
from app.services.evidence_service import build_scan_evidence
from app.services.provider_evidence_service import build_provider_evidence
from app.services.manual_evidence_service import MANUAL_EVIDENCE_FEATURE, list_manual_evidence_for_scan, manual_evidence_action_to_item

log = logging.getLogger(__name__)
router = APIRouter(prefix='/scans', tags=['scans'])
settings = get_settings()


def _append_config_provider_status(query: dict, statuses: list[dict]) -> list[dict]:
    augmented = list(statuses)
    providers = {status.get('provider') for status in augmented}

    if query.get('email') and not settings.HIBP_API_KEY and 'hibp' not in providers:
        augmented.append({
            'provider': 'hibp',
            'label': 'Have I Been Pwned',
            'status': 'unavailable',
            'message': 'HIBP is not configured for this runtime. Email breach and paste checks need HIBP_API_KEY.',
            'fallback_available': True,
            'item_count': 0,
        })

    return augmented


def _scan_subject(query: dict) -> tuple[str | None, str | None]:
    for key in ('email', 'phone', 'ip_address', 'username', 'full_name'):
        value = query.get(key)
        if value:
            return str(value), key
    return None, None


def _scan_job_out(scan: Scan) -> ScanJobOut:
    query = json.loads(decrypt_pii(scan.query_enc))
    subject, subject_kind = _scan_subject(query)
    return ScanJobOut(
        scan_id=scan.id,
        status=scan.status,
        progress=scan.progress,
        current_stage=scan.current_stage,
        estimated_seconds=scan.estimated_seconds,
        created_at=scan.created_at,
        vault_saved=scan.user_id is not None,
        subject=subject,
        subject_kind=subject_kind,
        total_exposures=scan.total_exposures,
        risk_score=scan.risk_score,
    )


@router.post('', response_model=ScanJobOut, status_code=201)
async def create_scan(
    body: ScanRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    user_id: str | None = Depends(get_current_user_id),
):
    if not body.has_any_identifier():
        raise HTTPException(400, 'Provide at least one identifier (email, phone, ip_address, username, or full_name)')

    query = body.model_dump(exclude_none=True, exclude={'notify_email'})
    scan_id = generate_scan_id()
    scan = Scan(
        id=scan_id,
        query_enc=encrypt_pii(json.dumps(query)),
        notify_email_enc=encrypt_pii(body.notify_email) if body.notify_email else None,
        user_id=user_id,
        estimated_seconds=90,
    )
    db.add(scan)
    await db.flush()
    await db.commit()

    if settings.RUN_SCANS_INLINE:
        background_tasks.add_task(execute_scan, scan_id)
    else:
        run_scan.apply_async(args=[scan_id], task_id=f'scan-{scan_id}')
    log.info('Scan %s queued', scan_id)

    return _scan_job_out(scan)


@router.get('', response_model=list[ScanJobOut])
async def list_scans(
    db: AsyncSession = Depends(get_db),
    user_id: str | None = Depends(get_current_user_id),
):
    stmt = select(Scan).order_by(Scan.created_at.desc()).limit(50)
    if user_id is not None:
        stmt = stmt.where(Scan.user_id == user_id)
    else:
        stmt = stmt.where(Scan.user_id.is_(None))
    result = await db.execute(stmt)
    scans = result.scalars().all()
    return [_scan_job_out(scan) for scan in scans]


@router.get('/{scan_id}/status', response_model=ScanJobOut)
async def scan_status(
    scan_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str | None = Depends(get_current_user_id),
):
    scan = await _get_scan(scan_id, db, user_id)
    return _scan_job_out(scan)


@router.get('/{scan_id}', response_model=ScanResultOut)
async def get_scan_result(
    scan_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str | None = Depends(get_current_user_id),
):
    result = await db.execute(
        select(Scan)
        .where(Scan.id == scan_id)
        .options(
            selectinload(Scan.breaches),
            selectinload(Scan.broker_listings),
            selectinload(Scan.honey_tokens).selectinload(HoneyToken.hits),
            selectinload(Scan.compliance_result),
        )
    )
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(404, 'Scan not found')
    _assert_scan_owner(scan, user_id)

    honey_hits = []
    for token in scan.honey_tokens:
        for hit in token.hits:
            honey_hits.append({
                'id': hit.id,
                'token_id': token.id,
                'token_type': token.token_type,
                'hit_source': hit.hit_source,
                'hit_timestamp': hit.hit_timestamp,
                'context_snippet': hit.context_snippet,
            })

    compliance = None
    if scan.compliance_result:
        cr = scan.compliance_result
        compliance = {
            'overall': cr.overall,
            'gdpr_score': cr.gdpr_score,
            'ccpa_score': cr.ccpa_score,
            'risk_level': cr.risk_level,
            'violations': cr.violations,
            'recommendations': cr.recommendations,
        }

    query = json.loads(decrypt_pii(scan.query_enc))

    provider_bundle = None
    provider_evidence = (
        json.loads(decrypt_pii(scan.provider_evidence_enc))
        if scan.provider_evidence_enc
        else []
    )
    provider_status = (
        json.loads(decrypt_pii(scan.provider_status_enc))
        if scan.provider_status_enc
        else []
    )
    # Older completed scans may predate persisted provider evidence. Do not
    # re-run external providers during progress polling for an active scan.
    if scan.status == 'completed' and not provider_evidence and not provider_status:
        provider_bundle = await build_provider_evidence(query)
        provider_evidence = provider_bundle.items
        provider_status = provider_bundle.statuses
    manual_evidence = await list_manual_evidence_for_scan(db, scan.id, user_id)
    evidence_items = build_scan_evidence(scan, query)
    evidence_items = [*provider_evidence, *manual_evidence, *evidence_items]

    provider_status = _append_config_provider_status(query, provider_status)

    return {
        'scan_id': scan.id,
        'status': scan.status,
        'created_at': scan.created_at,
        'completed_at': scan.completed_at,
        'query': query,
        'vault_saved': scan.user_id is not None,
        'breaches': scan.breaches,
        'broker_listings': scan.broker_listings,
        'honey_token_hits': honey_hits,
        'compliance': compliance,
        'evidence_items': evidence_items,
        'provider_status': provider_status,
        'total_exposures': scan.total_exposures,
        'risk_score': scan.risk_score,
    }


@router.post('/{scan_id}/manual-evidence', response_model=EvidenceItemOut, status_code=201)
async def capture_manual_evidence(
    scan_id: str,
    body: ManualEvidenceIn,
    db: AsyncSession = Depends(get_db),
    user_id: str | None = Depends(get_current_user_id),
):
    await _get_scan(scan_id, db, user_id)
    evidence = {
        'title': body.title,
        'source_name': body.source_name,
        'source_url': body.source_url,
        'detail': body.detail,
        'risk_level': body.risk_level,
        'source_category': body.source_category,
        'confidence': body.confidence,
        'captured_at': body.captured_at,
        'exposed_fields': body.exposed_fields,
        'action_label': body.action_label,
    }
    action = CommandAction(
        user_id=user_id,
        feature=MANUAL_EVIDENCE_FEATURE,
        title=body.title,
        status='captured',
        payload={
            'scan_id': scan_id,
            'evidence': evidence,
        },
    )
    db.add(action)
    await db.flush()
    await db.commit()
    await db.refresh(action)
    return manual_evidence_action_to_item(action)


@router.get('/{scan_id}/dsar', response_model=list[DsarRequestOut])
async def list_dsar(
    scan_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str | None = Depends(get_current_user_id),
):
    await _get_scan(scan_id, db, user_id)
    result = await db.execute(
        select(DsarRequest).where(DsarRequest.scan_id == scan_id)
    )
    return result.scalars().all()


@router.post('/{scan_id}/dsar/{broker_id}/send', response_model=DsarRequestOut)
async def send_single_dsar(
    scan_id: str,
    broker_id: str,
    body: OptOutConfirmIn,
    db: AsyncSession = Depends(get_db),
    user_id: str | None = Depends(get_current_user_id),
):
    _assert_real_opt_out_confirmed(body)
    await _get_scan(scan_id, db, user_id)
    result = await db.execute(select(BrokerListing).where(BrokerListing.id == broker_id, BrokerListing.scan_id == scan_id))
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(404, 'Broker listing not found')

    dsar = await _ensure_dsar(scan_id, listing, db)
    dsar.status = 'queued'
    listing.opt_out_status = 'in_progress'
    await db.commit()
    send_dsar.delay(scan_id, listing.id)
    return dsar


@router.post('/{scan_id}/dsar/send-all', response_model=OptOutQueueOut)
async def send_all_dsar(
    scan_id: str,
    body: OptOutConfirmIn,
    db: AsyncSession = Depends(get_db),
    user_id: str | None = Depends(get_current_user_id),
):
    _assert_real_opt_out_confirmed(body)
    await _get_scan(scan_id, db, user_id)
    result = await db.execute(
        select(BrokerListing)
        .where(BrokerListing.scan_id == scan_id, BrokerListing.dsar_eligible == True)
    )
    listings = result.scalars().all()
    queued = 0
    for listing in listings:
        dsar = await _ensure_dsar(scan_id, listing, db)
        dsar.status = 'queued'
        listing.opt_out_status = 'in_progress'
        queued += 1
    await db.commit()
    for listing in listings:
        send_dsar.delay(scan_id, listing.id)
    return OptOutQueueOut(
        queued=queued,
        skipped=0,
        status='queued',
        message='Real opt-out requests queued for delivery.',
    )


@router.post('/{scan_id}/opt-out/{broker_id}')
async def opt_out_broker(
    scan_id: str,
    broker_id: str,
    body: OptOutConfirmIn,
    db: AsyncSession = Depends(get_db),
    user_id: str | None = Depends(get_current_user_id),
):
    _assert_real_opt_out_confirmed(body)
    await _get_scan(scan_id, db, user_id)
    result = await db.execute(select(BrokerListing).where(BrokerListing.id == broker_id, BrokerListing.scan_id == scan_id))
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(404, 'Broker listing not found')
    dsar = await _ensure_dsar(scan_id, listing, db)
    dsar.status = 'queued'
    listing.opt_out_status = 'in_progress'
    await db.commit()
    send_dsar.delay(scan_id, listing.id)
    return {'status': 'queued', 'dsar_request_id': dsar.id}


@router.post('/{scan_id}/opt-out/all', response_model=OptOutQueueOut)
async def opt_out_all(
    scan_id: str,
    body: OptOutConfirmIn,
    db: AsyncSession = Depends(get_db),
    user_id: str | None = Depends(get_current_user_id),
):
    _assert_real_opt_out_confirmed(body)
    await _get_scan(scan_id, db, user_id)
    result = await db.execute(
        select(BrokerListing).where(BrokerListing.scan_id == scan_id, BrokerListing.opt_out_status == 'not_started')
    )
    listings = result.scalars().all()
    queued = 0
    for listing in listings:
        dsar = await _ensure_dsar(scan_id, listing, db)
        dsar.status = 'queued'
        listing.opt_out_status = 'in_progress'
        queued += 1
    await db.commit()
    for listing in listings:
        send_dsar.delay(scan_id, listing.id)
    return OptOutQueueOut(
        queued=queued,
        skipped=0,
        status='queued',
        message='One-stop opt-out requests queued for delivery.',
    )


@router.post('/{scan_id}/report', response_model=ReportJobOut, status_code=202)
async def create_report(
    scan_id: str,
    body: dict,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    user_id: str | None = Depends(get_current_user_id),
):
    scan = await _get_scan(scan_id, db, user_id)
    if scan.status != 'completed':
        raise HTTPException(409, 'Scan must complete before generating a report.')
    fmt = body.get('format', 'pdf')
    action = CommandAction(
        user_id=user_id,
        feature='report-package',
        title=f'Report package: {scan_id}',
        status='queued',
        payload={'scan_id': scan_id, 'format': fmt},
    )
    db.add(action)
    await db.flush()
    await db.commit()
    await db.refresh(action)

    if settings.RUN_SCANS_INLINE:
        background_tasks.add_task(generate_report_for_action, action.id, scan_id, fmt)
    else:
        generate_report.delay(action.id, scan_id, fmt)

    return _report_job_from_action(action)


@router.get('/{scan_id}/report/{action_id}', response_model=ReportJobOut)
async def get_report_job(
    scan_id: str,
    action_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str | None = Depends(get_current_user_id),
):
    action = await _get_report_action(scan_id, action_id, db, user_id)
    return _report_job_from_action(action)


@router.get('/{scan_id}/report/{action_id}/download')
async def download_report_job(
    scan_id: str,
    action_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str | None = Depends(get_current_user_id),
):
    action = await _get_report_action(scan_id, action_id, db, user_id)
    payload = action.payload or {}
    storage_kind = str(payload.get('storage_kind') or '')
    download_url = payload.get('download_url')
    if storage_kind == 's3' and download_url:
        return RedirectResponse(url=download_url, status_code=307)
    if storage_kind != 'local':
        raise HTTPException(404, 'Report artifact not available')

    storage_key = str(payload.get('storage_key') or '')
    report_path = _local_report_path(storage_key)
    if not report_path.exists():
        raise HTTPException(404, 'Report artifact not found')

    filename = str(payload.get('filename') or report_path.name)
    media_type = str(payload.get('content_type') or 'application/octet-stream')
    return FileResponse(report_path, media_type=media_type, filename=filename)


async def _get_scan(scan_id: str, db: AsyncSession, user_id: str | None = None) -> Scan:
    result = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(404, 'Scan not found')
    _assert_scan_owner(scan, user_id)
    return scan


def _assert_scan_owner(scan: Scan, user_id: str | None) -> None:
    if scan.user_id is None:
        return
    if user_id is None:
        raise HTTPException(404, 'Scan not found')
    if scan.user_id != user_id:
        raise HTTPException(404, 'Scan not found')


async def _get_report_action(
    scan_id: str,
    action_id: str,
    db: AsyncSession,
    user_id: str | None,
) -> CommandAction:
    await _get_scan(scan_id, db, user_id)
    result = await db.execute(
        select(CommandAction).where(
            CommandAction.id == action_id,
            CommandAction.feature == 'report-package',
        )
    )
    action = result.scalar_one_or_none()
    if not action:
        raise HTTPException(404, 'Report job not found')
    if action.user_id is not None and user_id is None:
        raise HTTPException(404, 'Report job not found')
    if user_id is not None and action.user_id != user_id:
        raise HTTPException(404, 'Report job not found')
    payload_scan_id = str((action.payload or {}).get('scan_id') or '')
    if payload_scan_id != scan_id:
        raise HTTPException(404, 'Report job not found')
    return action


def _local_report_path(storage_key: str) -> Path:
    base = Path(settings.REPORT_STORAGE_DIR).resolve()
    path = (base / storage_key).resolve()
    if base not in path.parents and path != base:
        raise HTTPException(404, 'Report artifact not found')
    return path


def _report_job_from_action(action: CommandAction) -> ReportJobOut:
    payload = action.payload or {}
    download_url = payload.get('download_url')
    if not download_url and payload.get('storage_kind') == 'local':
        download_url = (
            f'{settings.PUBLIC_APP_URL.rstrip("/")}/api/v1/scans/'
            f'{payload.get("scan_id")}/report/{action.id}/download'
        )
    return ReportJobOut(
        action_id=action.id,
        scan_id=str(payload.get('scan_id') or ''),
        status=action.status,
        format=str(payload.get('format') or 'pdf'),
        generated_at=payload.get('generated_at'),
        download_url=download_url,
        includes_dsar=payload.get('includes_dsar'),
        includes_compliance=payload.get('includes_compliance'),
        expires_at=payload.get('expires_at'),
        error=payload.get('error'),
    )


def _assert_real_opt_out_confirmed(body: OptOutConfirmIn) -> None:
    if not settings.ALLOW_REAL_OPT_OUTS:
        raise HTTPException(
            409,
            'Real opt-out delivery is disabled. Set ALLOW_REAL_OPT_OUTS=true and configure SES/email credentials before sending.',
        )
    if not body.confirmed:
        raise HTTPException(
            400,
            'Explicit confirmation is required before transmitting personal data to broker privacy contacts.',
        )


async def _ensure_dsar(scan_id: str, listing: BrokerListing, db: AsyncSession) -> DsarRequest:
    result = await db.execute(
        select(DsarRequest).where(
            DsarRequest.scan_id == scan_id,
            DsarRequest.broker_listing_id == listing.id,
        )
    )
    dsar = result.scalar_one_or_none()
    if dsar:
        return dsar
    dsar = DsarRequest(
        scan_id=scan_id,
        broker_listing_id=listing.id,
        broker_name=listing.broker_name,
        status='draft',
    )
    db.add(dsar)
    await db.flush()
    return dsar
