from __future__ import annotations

from datetime import datetime
from typing import Any
from urllib.parse import quote_plus


def _google_site_search(domain: str, query: str) -> str:
    return f'https://www.google.com/search?q=site:{quote_plus(domain)}+{quote_plus(query)}'


def _format_breach_source_url(source: str, source_type: str) -> str:
    normalized = (source or '').strip()
    if normalized.startswith(('http://', 'https://')):
        return normalized
    if source_type == 'paste_site':
        return 'https://haveibeenpwned.com/Pastes'
    return 'https://haveibeenpwned.com/'


def _format_honey_source_url(source: str) -> str:
    normalized = (source or '').strip()
    if normalized.startswith(('http://', 'https://', 'mailto:')):
        return normalized
    if '@' in normalized and ' ' not in normalized:
        return f'mailto:{normalized}'
    if '.' in normalized and ' ' not in normalized:
        return f'https://{normalized}'
    return 'https://www.vindica.me/reports'


def build_scan_evidence(scan: Any, query: dict | None = None) -> list[dict]:
    evidence_items: list[dict] = []

    for breach in getattr(scan, 'breaches', []):
        evidence_items.append({
            'id': f'breach:{breach.id}',
            'kind': 'breach',
            'title': f'{breach.source} exposure',
            'source_name': breach.source,
            'source_category': breach.source_type,
            'source_url': _format_breach_source_url(breach.source, breach.source_type),
            'detail': breach.description,
            'risk_level': breach.severity,
            'confidence': 'verified' if breach.verified else 'reported',
            'captured_at': breach.discovered_date,
            'exposed_fields': breach.exposed_fields,
            'action_label': 'Review breach source',
        })

    for listing in getattr(scan, 'broker_listings', []):
        source_url = listing.listing_url or listing.broker_url
        evidence_items.append({
            'id': f'broker:{listing.id}',
            'kind': 'broker_listing',
            'title': f'{listing.broker_name} listing',
            'source_name': listing.broker_name,
            'source_category': 'data_broker',
            'source_url': source_url,
            'detail': f'Visible broker profile exposing {", ".join(listing.fields_exposed[:4]) or "personal data"}.',
            'risk_level': 'high' if listing.opt_out_status != 'confirmed' else 'medium',
            'confidence': 'direct',
            'captured_at': listing.last_seen,
            'exposed_fields': listing.fields_exposed,
            'action_label': 'Open listing',
        })

    for token in getattr(scan, 'honey_tokens', []):
        for hit in getattr(token, 'hits', []):
            evidence_items.append({
                'id': f'honey:{hit.id}',
                'kind': 'honey_token',
                'title': f'{token.token_type} reuse signal',
                'source_name': hit.hit_source,
                'source_category': 'honey_token',
                'source_url': _format_honey_source_url(hit.hit_source),
                'detail': hit.context_snippet or f'Observed contact or reuse signal from {hit.hit_source}.',
                'risk_level': 'medium',
                'confidence': 'sensor',
                'captured_at': hit.hit_timestamp.isoformat() if isinstance(hit.hit_timestamp, datetime) else str(hit.hit_timestamp),
                'exposed_fields': [token.token_type],
                'action_label': 'Open source record',
            })

    return evidence_items
