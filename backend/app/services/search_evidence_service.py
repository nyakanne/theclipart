from __future__ import annotations

import asyncio
import hashlib
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlparse

import httpx

from app.core.config import get_settings

log = logging.getLogger(__name__)
settings = get_settings()


class BraveSearchError(RuntimeError):
    """Raised when Brave could not complete a search request."""


@dataclass(frozen=True)
class SearchPlan:
    query: str
    source_category: str
    result_count: int


@dataclass(frozen=True)
class SearchEvidenceBundle:
    items: list[dict] = field(default_factory=list)
    statuses: list[dict] = field(default_factory=list)


@lru_cache(maxsize=1)
def _load_brokers() -> list[dict]:
    path = Path(settings.BROKER_LIST_PATH)
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text())
    except Exception as exc:
        log.warning('Could not load broker catalog for search evidence: %s', exc)
        return []


def _query_kind(query: dict) -> str | None:
    if query.get('email'):
        return 'email'
    if query.get('phone'):
        return 'phone'
    if query.get('ip_address'):
        return 'ip'
    if query.get('username'):
        return 'username'
    if query.get('full_name'):
        return 'name'
    return None


def _query_seed(query: dict) -> str:
    return (
        query.get('email')
        or query.get('phone')
        or query.get('ip_address')
        or query.get('username')
        or query.get('full_name')
        or ''
    ).strip()


def _broad_query(kind: str, seed: str) -> str:
    if kind == 'name':
        return f'"{seed}" address phone email'
    if kind == 'username':
        return f'"{seed}" profile'
    return f'"{seed}"'


def _relevant_broker_domains(kind: str) -> list[str]:
    domains: list[str] = []
    for broker in _load_brokers():
        broker_kind = str(broker.get('search_type') or '').lower()
        fields = {str(field).lower() for field in broker.get('fields', [])}
        include = False
        if kind == 'name':
            include = broker_kind == 'name'
        elif kind == 'phone':
            include = broker_kind == 'phone' or 'phone' in fields
        elif kind == 'email':
            include = 'email' in fields
        elif kind == 'username':
            include = 'username' in fields or 'social profiles' in fields
        if not include:
            continue
        domain = urlparse(str(broker.get('url') or '')).netloc.lower().removeprefix('www.')
        if domain and domain not in domains:
            domains.append(domain)
    return domains[: settings.BRAVE_SEARCH_MAX_BROKER_QUERIES]


def _search_plans(query: dict) -> list[SearchPlan]:
    kind = _query_kind(query)
    seed = _query_seed(query)
    if not kind or not seed or kind == 'ip':
        return []

    plans = [SearchPlan(query=_broad_query(kind, seed), source_category='public_web', result_count=settings.BRAVE_SEARCH_MAX_RESULTS)]
    for domain in _relevant_broker_domains(kind):
        plans.append(
            SearchPlan(
                query=f'site:{domain} "{seed}"',
                source_category='broker_search',
                result_count=min(3, settings.BRAVE_SEARCH_MAX_RESULTS),
            )
        )
    return plans


async def _brave_search(plan: SearchPlan) -> list[dict]:
    if not settings.brave_search_key:
        return []

    headers = {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': settings.brave_search_key,
    }
    params = {
        'q': plan.query,
        'count': str(plan.result_count),
        'country': settings.BRAVE_SEARCH_COUNTRY,
        'search_lang': settings.BRAVE_SEARCH_SEARCH_LANG,
        'safesearch': settings.BRAVE_SEARCH_SAFESEARCH,
    }

    async with httpx.AsyncClient(timeout=settings.BRAVE_SEARCH_TIMEOUT_SECONDS) as client:
        response = await client.get(settings.BRAVE_SEARCH_BASE_URL, headers=headers, params=params)
        if response.status_code in {401, 403, 429}:
            log.warning('Brave Search request failed with %s for query fingerprint %s', response.status_code, hashlib.sha256(plan.query.encode()).hexdigest()[:12])
            reason = {
                401: 'authentication failed',
                403: 'access was denied',
                429: 'the request quota or rate limit was reached',
            }[response.status_code]
            raise BraveSearchError(f'Brave Search {reason}.')
        response.raise_for_status()
        payload = response.json()

    return payload.get('web', {}).get('results', []) or []


def _risk_level(kind: str, source_category: str) -> str:
    if source_category == 'broker_search':
        return 'high'
    if kind in {'email', 'phone'}:
        return 'high'
    if kind in {'name', 'username'}:
        return 'medium'
    return 'info'


def _exposed_fields(kind: str, query: dict) -> list[str]:
    fields = {
        'email': ['email'],
        'phone': ['phone'],
        'username': ['username'],
        'name': ['name'],
    }.get(kind, [])
    if query.get('full_name') and 'name' not in fields:
        fields.append('name')
    return fields


async def build_search_evidence(query: dict) -> SearchEvidenceBundle:
    kind = _query_kind(query)
    if not kind or kind == 'ip':
        return SearchEvidenceBundle()
    if not settings.brave_search_key:
        return SearchEvidenceBundle(
            statuses=[{
                'provider': 'brave_search',
                'label': 'Brave Search',
                'status': 'unavailable',
                'message': 'Brave Search is not configured for this runtime. Manual source capture is available.',
                'fallback_available': True,
                'item_count': 0,
            }]
        )

    plans = _search_plans(query)
    if not plans:
        return SearchEvidenceBundle(
            statuses=[{
                'provider': 'brave_search',
                'label': 'Brave Search',
                'status': 'skipped',
                'message': 'No search plan matched this query type.',
                'fallback_available': False,
                'item_count': 0,
            }]
        )

    gathered = await asyncio.gather(*[_brave_search(plan) for plan in plans], return_exceptions=True)
    evidence_items: list[dict] = []
    seen_urls: set[str] = set()
    exposed_fields = _exposed_fields(kind, query)
    failures: list[str] = []

    for plan, search_results in zip(plans, gathered):
        if isinstance(search_results, Exception):
            log.warning('Search evidence query failed for fingerprint %s: %s', hashlib.sha256(plan.query.encode()).hexdigest()[:12], search_results)
            failures.append(str(search_results) or type(search_results).__name__)
            continue
        for result in search_results:
            url = str(result.get('url') or '').strip()
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            title = str(result.get('title') or '').strip() or 'Indexed exposure result'
            description = str(result.get('description') or '').strip()
            extra_snippets = [str(item).strip() for item in result.get('extra_snippets') or [] if str(item).strip()]
            detail = description or (extra_snippets[0] if extra_snippets else f'Indexed web result for {_query_seed(query)}.')
            hostname = urlparse(url).netloc.lower().removeprefix('www.')
            source_category = 'data_broker' if plan.source_category == 'broker_search' else plan.source_category
            evidence_items.append({
                'id': f'search:{hashlib.sha256(url.encode()).hexdigest()[:16]}',
                'kind': 'search_result',
                'title': title,
                'source_name': hostname or 'Brave Search',
                'source_category': source_category,
                'source_url': url,
                'detail': detail,
                'risk_level': _risk_level(kind, plan.source_category),
                'confidence': 'indexed_search',
                'captured_at': result.get('page_age') or result.get('age') or datetime.now(timezone.utc).isoformat(),
                'exposed_fields': exposed_fields,
                'action_label': 'Open indexed page',
            })

    if evidence_items:
        status = {
            'provider': 'brave_search',
            'label': 'Brave Search',
            'status': 'completed',
            'message': (
                f'Indexed {len(evidence_items)} source-backed web results; '
                f'{len(failures)} additional search request(s) failed.'
                if failures
                else f'Indexed {len(evidence_items)} source-backed web results for this query.'
            ),
            'fallback_available': bool(failures),
            'item_count': len(evidence_items),
        }
    elif failures:
        status = {
            'provider': 'brave_search',
            'label': 'Brave Search',
            'status': 'failed',
            'message': f'Brave Search failed: {failures[0]} Check provider access or capture a source manually.',
            'fallback_available': True,
            'item_count': 0,
        }
    else:
        status = {
            'provider': 'brave_search',
            'label': 'Brave Search',
            'status': 'no_match',
            'message': 'Brave Search returned no explicit source pages for this query. Manual source capture is available.',
            'fallback_available': True,
            'item_count': 0,
        }

    return SearchEvidenceBundle(items=evidence_items, statuses=[status])
