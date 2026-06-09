"""
Celery task definitions.
All tasks run in isolated worker containers alongside Playwright.
"""
import asyncio
import json
import logging
from datetime import datetime, timezone

from celery import shared_task
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import decrypt_json_payload, decrypt_pii, encrypt_json_payload, encrypt_pii
from app.workers.celery_app import celery_app

log = logging.getLogger(__name__)
settings = get_settings()


def _sync_db():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    engine = create_engine(settings.SYNC_DATABASE_URL)
    return sessionmaker(bind=engine)()


def _update_scan(db: Session, scan_id: str, **kwargs):
    from app.models.scan import Scan
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if scan:
        for k, v in kwargs.items():
            setattr(scan, k, v)
        db.commit()


def _clear_incomplete_scan_outputs(db: Session, scan_id: str) -> None:
    """Make Celery retries idempotent after a partially completed scan."""
    from app.models.scan import (
        BreachRecord,
        BrokerListing,
        ComplianceResult,
        DsarRequest,
        HoneyToken,
        HoneyTokenHit,
        Scan,
    )

    token_ids = [
        token_id
        for (token_id,) in db.query(HoneyToken.id).filter(HoneyToken.scan_id == scan_id).all()
    ]
    if token_ids:
        db.query(HoneyTokenHit).filter(HoneyTokenHit.token_id.in_(token_ids)).delete(
            synchronize_session=False
        )

    db.query(DsarRequest).filter(DsarRequest.scan_id == scan_id).delete(synchronize_session=False)
    db.query(ComplianceResult).filter(ComplianceResult.scan_id == scan_id).delete(synchronize_session=False)
    db.query(BrokerListing).filter(BrokerListing.scan_id == scan_id).delete(synchronize_session=False)
    db.query(BreachRecord).filter(BreachRecord.scan_id == scan_id).delete(synchronize_session=False)
    db.query(HoneyToken).filter(HoneyToken.scan_id == scan_id).delete(synchronize_session=False)
    db.query(Scan).filter(Scan.id == scan_id).update(
        {
            Scan.provider_evidence_enc: None,
            Scan.provider_status_enc: None,
            Scan.total_exposures: 0,
            Scan.risk_score: 0.0,
            Scan.completed_at: None,
        },
        synchronize_session=False,
    )
    db.commit()


def _json_safe(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    return value


def _serialize_compliance_result(compliance):
    if compliance is None:
        return None
    return {
        'overall': compliance.overall,
        'gdpr_score': compliance.gdpr_score,
        'ccpa_score': compliance.ccpa_score,
        'risk_level': compliance.risk_level,
        'violations': compliance.violations,
        'recommendations': compliance.recommendations,
    }


def _provider_risk_score(items: list[dict]) -> float:
    weights = {'critical': 32.0, 'high': 20.0, 'medium': 10.0, 'low': 4.0, 'info': 1.0}
    return min(100.0, sum(weights.get(str(item.get('risk_level')), 0.0) for item in items))


def _hibp_status(query: dict, breaches: list[dict], status: str | None = None, message: str | None = None) -> dict | None:
    if not query.get('email'):
        return None
    if not settings.HIBP_API_KEY:
        return {
            'provider': 'hibp',
            'label': 'Have I Been Pwned',
            'status': 'unavailable',
            'message': 'HIBP is not configured for this runtime. Add HIBP_API_KEY to enable email breach results.',
            'fallback_available': True,
            'item_count': 0,
        }
    return {
        'provider': 'hibp',
        'label': 'Have I Been Pwned',
        'status': status or ('completed' if breaches else 'no_match'),
        'message': message or (f'Found {len(breaches)} breach or paste records.' if breaches else 'No breach or paste records were returned.'),
        'fallback_available': status == 'failed',
        'item_count': len(breaches),
    }


@celery_app.task(bind=True, max_retries=3, default_retry_delay=10, queue='scans')
def run_scan(self, scan_id: str):
    try:
        execute_scan(scan_id)
    except Exception as exc:
        raise self.retry(exc=exc)


def execute_scan(scan_id: str):
    from app.models.scan import Scan, BreachRecord, BrokerListing, HoneyToken, ComplianceResult
    from app.services.breach_checker import run_breach_checks
    from app.services.compliance_service import score_compliance
    from app.services.email_service import send_scan_complete
    from app.services.provider_evidence_service import build_provider_evidence

    db = _sync_db()
    try:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if not scan:
            log.error('Scan %s not found', scan_id)
            return
        if scan.status == 'completed':
            log.info('Scan %s is already complete; skipping duplicate delivery', scan_id)
            return

        query = json.loads(decrypt_pii(scan.query_enc))

        _clear_incomplete_scan_outputs(db, scan_id)

        _update_scan(db, scan_id, status='scanning', current_stage='breach_db — checking HIBP', progress=5.0, estimated_seconds=85)

        breach_bundle = asyncio.run(run_breach_checks(query))
        breaches = breach_bundle.items
        for b in breaches:
            db.add(BreachRecord(scan_id=scan_id, **b))
        db.commit()

        _update_scan(db, scan_id, current_stage='source_intel — capturing provider evidence', progress=20.0, estimated_seconds=70)
        provider_bundle = asyncio.run(build_provider_evidence(query))
        provider_status = list(provider_bundle.statuses)
        hibp_status = _hibp_status(query, breaches, breach_bundle.hibp_status, breach_bundle.hibp_message)
        if hibp_status:
            provider_status.append(hibp_status)
        _update_scan(
            db,
            scan_id,
            provider_evidence_enc=encrypt_pii(json.dumps(_json_safe(provider_bundle.items))),
            provider_status_enc=encrypt_pii(json.dumps(_json_safe(provider_status))),
        )

        _update_scan(db, scan_id, current_stage='data_broker — scanning Playwright workers', progress=30.0, estimated_seconds=60)

        from app.workers.playwright_worker import scan_all_brokers

        def _report_broker_progress(current_index: int, total_brokers: int, broker: dict) -> None:
            total = max(total_brokers, 1)
            broker_progress = 30.0 + ((current_index - 1) / total) * 35.0
            broker_name = broker.get('name', 'broker')
            _update_scan(
                db,
                scan_id,
                current_stage=f'data_broker — scanning {broker_name} ({current_index}/{total})',
                progress=broker_progress,
                estimated_seconds=max(15, int(60 - ((current_index - 1) / total) * 40)),
            )

        try:
            broker_listings = scan_all_brokers(
                query,
                settings.BROKER_LIST_PATH,
                on_progress=_report_broker_progress,
            )
            provider_status.append({
                'provider': 'data_broker',
                'label': 'Data broker scan',
                'status': 'completed' if broker_listings else 'no_match',
                'message': (
                    f'Found {len(broker_listings)} broker listing(s).'
                    if broker_listings
                    else 'No broker listings were returned.'
                ),
                'fallback_available': False,
                'item_count': len(broker_listings),
            })
        except Exception as exc:
            log.exception('Broker scan failed for scan %s', scan_id)
            broker_listings = []
            provider_status.append({
                'provider': 'data_broker',
                'label': 'Data broker scan',
                'status': 'failed',
                'message': f'Broker browser stage failed: {type(exc).__name__}. Other scan results are still available.',
                'fallback_available': True,
                'item_count': 0,
            })

        _update_scan(
            db,
            scan_id,
            provider_status_enc=encrypt_pii(json.dumps(_json_safe(provider_status))),
        )
        if broker_listings:
            for bl in broker_listings:
                db.add(BrokerListing(scan_id=scan_id, **bl))
            db.commit()

        _update_scan(db, scan_id, current_stage='honey_token — seeding aliases', progress=65.0, estimated_seconds=15)
        _seed_honey_tokens_sync(db, scan_id, query)

        _update_scan(db, scan_id, current_stage='compliance — scoring violations', progress=80.0, estimated_seconds=8)
        all_breaches = [{'source': b.source, 'severity': b.severity, 'exposed_fields': b.exposed_fields, 'verified': b.verified} for b in db.query(BreachRecord).filter(BreachRecord.scan_id == scan_id).all()]
        all_listings = [{'broker_name': bl.broker_name, 'dsar_eligible': bl.dsar_eligible, 'opt_out_status': bl.opt_out_status, 'opt_out_deadline_days': bl.opt_out_deadline_days, 'fields_exposed': bl.fields_exposed} for bl in db.query(BrokerListing).filter(BrokerListing.scan_id == scan_id).all()]
        report = score_compliance(all_breaches, all_listings)
        db.add(ComplianceResult(
            scan_id=scan_id,
            overall=report.overall,
            gdpr_score=report.gdpr_score,
            ccpa_score=report.ccpa_score,
            risk_level=report.risk_level,
            violations=[vars(v) for v in report.violations],
            recommendations=report.recommendations,
        ))
        db.commit()

        risk_score = max(0.0, 100.0 - report.overall, _provider_risk_score(provider_bundle.items))
        total_exposures = len(breaches) + (len(broker_listings) if broker_listings else 0) + len(provider_bundle.items)

        _update_scan(db, scan_id,
                     status='completed',
                     progress=100.0,
                     current_stage='complete',
                     estimated_seconds=0,
                     risk_score=risk_score,
                     total_exposures=total_exposures,
                     completed_at=datetime.now(timezone.utc))

        if scan.notify_email_enc:
            notify_email = decrypt_pii(scan.notify_email_enc)
            send_scan_complete(notify_email, scan_id, risk_score, len(breaches))

        log.info(
            'Scan %s completed — %d breaches, %d provider items, risk %.1f',
            scan_id,
            len(breaches),
            len(provider_bundle.items),
            risk_score,
        )

    except Exception as exc:
        log.exception('Scan %s failed', scan_id)
        _update_scan(db, scan_id, status='failed', current_stage=f'failed: {exc}')
        raise
    finally:
        db.close()


@celery_app.task(bind=True, max_retries=2, queue='scans')
def run_playwright_scan(self, scan_id: str, query: dict) -> list[dict]:
    """Run Playwright broker scrapers in-process (worker is the isolated container)."""
    from app.workers.playwright_worker import scan_all_brokers
    try:
        return scan_all_brokers(query, settings.BROKER_LIST_PATH)
    except Exception as exc:
        log.exception('Playwright scan failed for scan %s', scan_id)
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, queue='dsar')
def send_dsar(self, scan_id: str, broker_listing_id: str):
    from app.models.scan import DsarRequest, BrokerListing, Scan
    from app.core.security import decrypt_pii
    from app.services.email_service import resolve_broker_privacy_email, send_dsar_email
    from datetime import timedelta

    db = _sync_db()
    try:
        listing = db.query(BrokerListing).filter(BrokerListing.id == broker_listing_id).first()
        dsar = db.query(DsarRequest).filter(DsarRequest.broker_listing_id == broker_listing_id).first()
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if not listing or not dsar or not scan:
            return

        query = json.loads(decrypt_pii(scan.query_enc))
        to_email = resolve_broker_privacy_email(listing.broker_name, listing.broker_url)
        if not to_email:
            dsar.status = 'failed'
            listing.opt_out_status = 'failed'
            db.commit()
            log.error('No verified privacy email configured for broker %s', listing.broker_name)
            return
        ok = send_dsar_email(to_email, listing.broker_name, scan_id, query)

        now = datetime.now(timezone.utc)
        dsar.status = 'sent' if ok else 'failed'
        dsar.sent_at = now
        dsar.deadline_at = now + timedelta(days=listing.opt_out_deadline_days or 45)
        listing.opt_out_status = 'submitted' if ok else 'failed'
        db.commit()
    finally:
        db.close()


def generate_report_for_action(action_id: str, scan_id: str, fmt: str = 'pdf'):
    from app.models.scan import Scan, BreachRecord, BrokerListing, ComplianceResult
    from app.models.scan import CommandAction
    from app.services.report_service import generate_report as _gen
    from app.core.security import decrypt_pii
    from app.services.evidence_service import build_scan_evidence
    from app.services.provider_evidence_service import build_provider_evidence
    from app.services.manual_evidence_service import list_manual_evidence_for_scan_sync

    db = _sync_db()
    try:
        action = db.query(CommandAction).filter(CommandAction.id == action_id).first()
        if action:
            action.status = 'running'
            db.commit()

        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        breaches = db.query(BreachRecord).filter(BreachRecord.scan_id == scan_id).all()
        listings = db.query(BrokerListing).filter(BrokerListing.scan_id == scan_id).all()
        compliance = db.query(ComplianceResult).filter(ComplianceResult.scan_id == scan_id).first()
        query = json.loads(decrypt_pii(scan.query_enc)) if scan else {}

        scan_data = {
            'scan_id': scan_id,
            'breaches': [{'source': b.source, 'severity': b.severity, 'exposed_fields': b.exposed_fields, 'breach_date': b.breach_date} for b in breaches],
            'broker_listings': [{'broker_name': bl.broker_name, 'fields_exposed': bl.fields_exposed} for bl in listings],
            'compliance': _serialize_compliance_result(compliance),
        }
        scan.breaches = breaches
        scan.broker_listings = listings
        evidence_items = build_scan_evidence(scan, query) if scan else []
        provider_bundle = asyncio.run(build_provider_evidence(query)) if query else None
        provider_evidence = provider_bundle.items if provider_bundle else []
        manual_evidence = list_manual_evidence_for_scan_sync(db, scan_id, scan.user_id if scan else None)
        scan_data['evidence_items'] = [*provider_evidence, *manual_evidence, *evidence_items]
        pkg = _gen(scan_id, scan_data, fmt)
        if action:
            action.status = 'completed'
            action.payload = encrypt_json_payload({
                **decrypt_json_payload(action.payload),
                **_json_safe(pkg),
            })
            db.commit()
        return pkg
    except Exception as exc:
        action = db.query(CommandAction).filter(CommandAction.id == action_id).first()
        if action:
            action.status = 'failed'
            action.payload = encrypt_json_payload({
                **decrypt_json_payload(action.payload),
                'error': str(exc),
            })
            db.commit()
        raise
    finally:
        db.close()


@celery_app.task(queue='reports')
def generate_report(action_id: str, scan_id: str, fmt: str = 'pdf'):
    return generate_report_for_action(action_id, scan_id, fmt)


@celery_app.task(queue='honey')
def check_honey_tokens():
    """Periodic task: check Mailgun inbound for any sentinel alias hits."""
    from app.models.scan import HoneyToken
    import httpx, re

    db = _sync_db()
    try:
        if not settings.MAILGUN_API_KEY:
            return

        tokens = db.query(HoneyToken).all()
        alias_map = {t.alias: t for t in tokens}

        r = httpx.get(
            f'https://api.mailgun.net/v3/{settings.HONEY_DOMAIN}/events',
            auth=('api', settings.MAILGUN_API_KEY),
            params={'event': 'stored', 'limit': 100},
            timeout=10,
        )
        r.raise_for_status()
        events = r.json().get('items', [])

        for event in events:
            recipient = event.get('recipient', '')
            token = alias_map.get(recipient)
            if token:
                from app.models.scan import HoneyTokenHit
                db.add(HoneyTokenHit(
                    token_id=token.id,
                    hit_source=event.get('sender', 'unknown'),
                    context_snippet=event.get('message', {}).get('headers', {}).get('subject'),
                ))
        db.commit()
    finally:
        db.close()


def _seed_honey_tokens_sync(db: Session, scan_id: str, query: dict):
    from app.core.security import generate_honey_alias, hash_identifier
    from app.models.scan import HoneyToken

    for ttype in ['email', 'phone', 'name']:
        val = query.get(ttype) or (query.get('full_name') if ttype == 'name' else None)
        if not val:
            continue
        alias = generate_honey_alias(val, ttype)
        existing = db.query(HoneyToken).filter(HoneyToken.alias == alias).first()
        if not existing:
            db.add(HoneyToken(scan_id=scan_id, token_type=ttype, alias=alias, seed_hash=hash_identifier(val)))
    db.commit()
