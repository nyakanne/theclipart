"""
Datadog Command Center — admin endpoints.

All routes require a valid JWT. In production add role-based access control
(admin flag on User model) before exposing these publicly.
"""
from __future__ import annotations

import logging
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user_id
from app.core.config import get_settings
from app.core.database import get_db
from app.models.scan import Scan

log = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix='/admin', tags=['admin'])

DD_BASE = f'https://api.{settings.DD_SITE}'
DD_HEADERS = {
    'DD-API-KEY': settings.DD_API_KEY,
    'DD-APPLICATION-KEY': settings.DD_APP_KEY,
}

_HTTP_TIMEOUT = 10.0


# ── helpers ──────────────────────────────────────────────────────────────────

async def _dd_get(path: str) -> Any:
    """Proxy a GET request to the Datadog API. Returns parsed JSON or raises."""
    if not settings.DD_API_KEY or not settings.DD_APP_KEY:
        raise HTTPException(503, 'Datadog API keys not configured')
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.get(f'{DD_BASE}{path}', headers=DD_HEADERS)
    if resp.status_code == 403:
        raise HTTPException(502, 'Datadog API key invalid or insufficient scope')
    if resp.status_code != 200:
        raise HTTPException(502, f'Datadog API returned {resp.status_code}')
    return resp.json()


# ── routes ───────────────────────────────────────────────────────────────────

@router.get('/health')
async def system_health(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user_id),
):
    """Database connectivity + per-status scan counts."""
    try:
        rows = await db.execute(
            select(Scan.status, func.count().label('n')).group_by(Scan.status)
        )
        counts = {row.status: row.n for row in rows}
        db_ok = True
    except Exception as exc:
        log.warning('DB health check failed: %s', exc)
        counts = {}
        db_ok = False

    return {
        'database': 'ok' if db_ok else 'error',
        'scan_counts': {
            'queued':    counts.get('queued',    0),
            'scanning':  counts.get('scanning',  0),
            'completed': counts.get('completed', 0),
            'failed':    counts.get('failed',    0),
        },
        'total_scans': sum(counts.values()),
        'datadog_configured': bool(settings.DD_API_KEY and settings.DD_APP_KEY),
    }


@router.get('/monitors')
async def datadog_monitors(_: str = Depends(get_current_user_id)):
    """Return all Datadog monitors with their current status."""
    data = await _dd_get('/api/v1/monitor?with_downtimes=false&page_size=100')
    monitors = [
        {
            'id':      m.get('id'),
            'name':    m.get('name'),
            'type':    m.get('type'),
            'status':  m.get('overall_state', 'unknown'),
            'query':   m.get('query'),
            'tags':    m.get('tags', []),
            'message': m.get('message', ''),
            'modified': m.get('modified'),
        }
        for m in (data if isinstance(data, list) else [])
    ]
    # Sort: Alert first, then Warn, then No Data, then OK
    _order = {'Alert': 0, 'Warn': 1, 'No Data': 2, 'Unknown': 3, 'OK': 4}
    monitors.sort(key=lambda m: _order.get(m['status'], 3))
    return {'monitors': monitors, 'total': len(monitors)}


@router.get('/events')
async def datadog_events(_: str = Depends(get_current_user_id)):
    """Return the 50 most recent Datadog events (last 24 h)."""
    import time
    now = int(time.time())
    data = await _dd_get(f'/api/v1/events?start={now - 86400}&end={now}&priority=normal')
    events = data.get('events', [])[:50]
    return {
        'events': [
            {
                'id':         e.get('id'),
                'title':      e.get('title'),
                'text':       e.get('text', ''),
                'alert_type': e.get('alert_type', 'info'),
                'date_happened': e.get('date_happened'),
                'tags':       e.get('tags', []),
            }
            for e in events
        ]
    }
