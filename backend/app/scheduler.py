"""Proactive scheduler: runs background scans and generates daily briefings."""

import logging
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_scheduler: AsyncIOScheduler | None = None


def get_scheduler() -> AsyncIOScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = AsyncIOScheduler(timezone="UTC")
    return _scheduler


# ── Scheduled tasks ────────────────────────────────────────────────────────────

async def _run_daily_briefing():
    """Generate the daily briefing by running all proactive scans."""
    from app.db import SessionLocal
    from app.agents.router import run_briefing_scan

    logger.info("[scheduler] Starting daily briefing at %s", datetime.utcnow().isoformat())
    try:
        async with SessionLocal() as session:
            await run_briefing_scan(session)
        logger.info("[scheduler] Daily briefing complete.")
    except Exception as exc:
        logger.error("[scheduler] Daily briefing failed: %s", exc)


async def _run_deadline_scan():
    """Detect approaching deadlines and create proposed reminders."""
    from app.db import SessionLocal
    from sqlalchemy import select
    from app.models import Deadline, ActionStatus, ProposedAction

    logger.info("[scheduler] Running deadline scan")
    try:
        async with SessionLocal() as session:
            now = datetime.utcnow()
            result = await session.execute(
                select(Deadline).where(
                    Deadline.status == "pending",
                    Deadline.alerted == False,  # noqa: E712
                    Deadline.due_at <= datetime.utcnow().replace(hour=23, minute=59),
                )
            )
            deadlines = result.scalars().all()
            for dl in deadlines:
                import uuid
                action = ProposedAction(
                    id=uuid.uuid4(),
                    title=f"Deadline approaching: {dl.title}",
                    action_type="deadline_alert",
                    reason=f"Deadline '{dl.title}' is due at {dl.due_at.isoformat()}",
                    source_memory_ids=[str(mid) for mid in (dl.source_memory_ids or [])],
                    risk_level="low",
                    reversible=True,
                    proposed_by="watcher",
                )
                session.add(action)
                dl.alerted = True
            await session.commit()
            logger.info("[scheduler] Deadline scan: %d alerts created", len(deadlines))
    except Exception as exc:
        logger.error("[scheduler] Deadline scan failed: %s", exc)


async def _run_memory_health_check():
    logger.info("[scheduler] Memory health check at %s", datetime.utcnow().isoformat())


# ── Lifecycle ──────────────────────────────────────────────────────────────────

def start():
    scheduler = get_scheduler()
    if scheduler.running:
        return

    scheduler.add_job(
        _run_daily_briefing,
        CronTrigger(hour=settings.DAILY_BRIEFING_HOUR, minute=settings.DAILY_BRIEFING_MINUTE),
        id="daily_briefing",
        replace_existing=True,
    )
    scheduler.add_job(
        _run_deadline_scan,
        IntervalTrigger(hours=1),
        id="deadline_scan",
        replace_existing=True,
    )
    scheduler.add_job(
        _run_memory_health_check,
        IntervalTrigger(hours=6),
        id="memory_health",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("[scheduler] Started. Daily briefing at %02d:%02d UTC.", settings.DAILY_BRIEFING_HOUR, settings.DAILY_BRIEFING_MINUTE)


def stop():
    scheduler = get_scheduler()
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("[scheduler] Stopped.")
