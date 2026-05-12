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
from app.core.database import Base
from app.core.security import decrypt_pii
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


@celery_app.task(bind=True, max_retries=3, default_retry_delay=10, queue='scans')
def run_scan(self, scan_id: str):
    from app.models.scan import Scan, BreachRecord, BrokerListing, HoneyToken, ComplianceResult
    from app.services.breach_checker import run_breach_checks
    from app.services.compliance_service import score_compliance
    from app.services.email_service import send_scan_complete

    db = _sync_db()
    try:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if not scan:
            log.error('Scan %s not found', scan_id)
            return

        query = json.loads(decrypt_pii(scan.query_enc))

        _update_scan(db, scan_id, status='scanning', current_stage='breach_db — checking HIBP', progress=5.0)

        breaches = asyncio.run(run_breach_checks(query))
        for b in breaches:
            db.add(BreachRecord(scan_id=scan_id, **b))
        db.commit()

        _update_scan(db, scan_id, current_stage='data_broker — scanning Playwright workers', progress=30.0)

        from app.workers.playwright_worker import scan_all_brokers

        broker_listings = scan_all_brokers(query, settings.BROKER_LIST_PATH)
        if broker_listings:
            for bl in broker_listings:
                db.add(BrokerListing(scan_id=scan_id, **bl))
            db.commit()

        _update_scan(db, scan_id, current_stage='honey_token — seeding aliases', progress=65.0)
        _seed_honey_tokens_sync(db, scan_id, query)

        _update_scan(db, scan_id, current_stage='compliance — scoring violations', progress=80.0)
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

        risk_score = max(0.0, 100.0 - report.overall)
        total_exposures = len(breaches) + (len(broker_listings) if broker_listings else 0)

        _update_scan(db, scan_id,
                     status='completed',
                     progress=100.0,
                     current_stage='complete',
                     risk_score=risk_score,
                     total_exposures=total_exposures,
                     completed_at=datetime.now(timezone.utc))

        if scan.notify_email_enc:
            notify_email = decrypt_pii(scan.notify_email_enc)
            send_scan_complete(notify_email, scan_id, risk_score, len(breaches))

        log.info('Scan %s completed — %d breaches, risk %.1f', scan_id, len(breaches), risk_score)

    except Exception as exc:
        log.exception('Scan %s failed', scan_id)
        _update_scan(db, scan_id, status='failed', current_stage=f'failed: {exc}')
        raise self.retry(exc=exc)
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
    from app.services.email_service import send_dsar_email
    from datetime import timedelta

    db = _sync_db()
    try:
        listing = db.query(BrokerListing).filter(BrokerListing.id == broker_listing_id).first()
        dsar = db.query(DsarRequest).filter(DsarRequest.broker_listing_id == broker_listing_id).first()
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if not listing or not dsar or not scan:
            return

        query = json.loads(decrypt_pii(scan.query_enc))
        to_email = f'privacy@{listing.broker_url.split("/")[2]}'
        ok = send_dsar_email(to_email, listing.broker_name, scan_id, query)

        now = datetime.now(timezone.utc)
        dsar.status = 'sent' if ok else 'failed'
        dsar.sent_at = now
        dsar.deadline_at = now + timedelta(days=listing.opt_out_deadline_days or 45)
        listing.opt_out_status = 'submitted' if ok else 'failed'
        db.commit()
    finally:
        db.close()


@celery_app.task(queue='reports')
def generate_report(scan_id: str, fmt: str = 'pdf'):
    from app.models.scan import Scan, BreachRecord, BrokerListing, ComplianceResult
    from app.services.report_service import generate_report as _gen
    from app.core.security import decrypt_pii

    db = _sync_db()
    try:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        breaches = db.query(BreachRecord).filter(BreachRecord.scan_id == scan_id).all()
        listings = db.query(BrokerListing).filter(BrokerListing.scan_id == scan_id).all()
        compliance = db.query(ComplianceResult).filter(ComplianceResult.scan_id == scan_id).first()

        scan_data = {
            'scan_id': scan_id,
            'breaches': [{'source': b.source, 'severity': b.severity, 'exposed_fields': b.exposed_fields, 'breach_date': b.breach_date} for b in breaches],
            'broker_listings': [{'broker_name': bl.broker_name, 'fields_exposed': bl.fields_exposed} for bl in listings],
            'compliance': vars(compliance) if compliance else None,
        }
        return _gen(scan_id, scan_data, fmt)
    finally:
        db.close()


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
