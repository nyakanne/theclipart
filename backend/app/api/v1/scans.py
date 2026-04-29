import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user_id
from app.core.database import get_db
from app.core.security import encrypt_pii, generate_scan_id
from app.models.scan import Scan, BreachRecord, BrokerListing, HoneyToken, HoneyTokenHit, DsarRequest, ComplianceResult
from app.schemas.scan import ScanRequest, ScanJobOut, ScanResultOut, DsarRequestOut, ReportPackageOut, OptOutConfirmIn, OptOutQueueOut
from app.workers.tasks import run_scan, send_dsar, generate_report
from app.core.config import get_settings

log = logging.getLogger(__name__)
router = APIRouter(prefix='/scans', tags=['scans'])
settings = get_settings()


@router.post('', response_model=ScanJobOut, status_code=201)
async def create_scan(
    body: ScanRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str | None = Depends(get_current_user_id),
):
    if not body.has_any_identifier():
        raise HTTPException(400, 'Provide at least one identifier (email, phone, username, or full_name)')

    query = body.model_dump(exclude_none=True, exclude={'notify_email'})
    scan_id = generate_scan_id()
    scan = Scan(
        id=scan_id,
        query_enc=encrypt_pii(json.dumps(query)),
        notify_email_enc=encrypt_pii(body.notify_email) if body.notify_email else None,
        user_id=user_id,
    )
    db.add(scan)
    await db.flush()
    await db.commit()

    run_scan.apply_async(args=[scan_id], task_id=f'scan-{scan_id}')
    log.info('Scan %s queued', scan_id)

    return ScanJobOut(
        scan_id=scan_id,
        status='queued',
        progress=0.0,
        current_stage='queued',
        created_at=scan.created_at,
    )


@router.get('', response_model=list[ScanJobOut])
async def list_scans(
    db: AsyncSession = Depends(get_db),
    user_id: str | None = Depends(get_current_user_id),
):
    stmt = select(Scan).order_by(Scan.created_at.desc()).limit(50)
    if user_id is not None:
        stmt = stmt.where(Scan.user_id == user_id)
    result = await db.execute(stmt)
    scans = result.scalars().all()
    return [ScanJobOut(
        scan_id=s.id, status=s.status, progress=s.progress,
        current_stage=s.current_stage, estimated_seconds=s.estimated_seconds,
        created_at=s.created_at,
    ) for s in scans]


@router.get('/{scan_id}/status', response_model=ScanJobOut)
async def scan_status(
    scan_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str | None = Depends(get_current_user_id),
):
    scan = await _get_scan(scan_id, db, user_id)
    return ScanJobOut(
        scan_id=scan.id, status=scan.status, progress=scan.progress,
        current_stage=scan.current_stage, estimated_seconds=scan.estimated_seconds,
        created_at=scan.created_at,
    )


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

    return {
        'scan_id': scan.id,
        'status': scan.status,
        'created_at': scan.created_at,
        'completed_at': scan.completed_at,
        'breaches': scan.breaches,
        'broker_listings': scan.broker_listings,
        'honey_token_hits': honey_hits,
        'compliance': compliance,
        'total_exposures': scan.total_exposures,
        'risk_score': scan.risk_score,
    }


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


@router.post('/{scan_id}/report', response_model=ReportPackageOut)
async def create_report(
    scan_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    user_id: str | None = Depends(get_current_user_id),
):
    await _get_scan(scan_id, db, user_id)
    fmt = body.get('format', 'pdf')
    result = generate_report.delay(scan_id, fmt).get(timeout=120)
    return result


async def _get_scan(scan_id: str, db: AsyncSession, user_id: str | None = None) -> Scan:
    result = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(404, 'Scan not found')
    _assert_scan_owner(scan, user_id)
    return scan


def _assert_scan_owner(scan: Scan, user_id: str | None) -> None:
    if user_id is None:
        return
    if scan.user_id != user_id:
        raise HTTPException(404, 'Scan not found')


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
