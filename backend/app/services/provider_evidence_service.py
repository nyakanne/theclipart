from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

from app.core.config import get_settings
from app.services.ipinfo_service import lookup_ipinfo
from app.services.search_evidence_service import build_search_evidence

settings = get_settings()


@dataclass(frozen=True)
class ProviderEvidenceBundle:
    items: list[dict] = field(default_factory=list)
    statuses: list[dict] = field(default_factory=list)


async def build_provider_evidence(query: dict) -> ProviderEvidenceBundle:
    evidence_items: list[dict] = []
    statuses: list[dict] = []

    if query.get('ip_address'):
        ip_data: dict = {}
        if not settings.IPINFO_TOKEN:
            statuses.append({
                'provider': 'ipinfo',
                'label': 'IPinfo Lite',
                'status': 'unavailable',
                'message': 'IPinfo is not configured for this runtime. Manual source capture is available.',
                'fallback_available': True,
                'item_count': 0,
            })
        else:
            try:
                ip_data = await lookup_ipinfo(query['ip_address'])
            except Exception:
                statuses.append({
                    'provider': 'ipinfo',
                    'label': 'IPinfo Lite',
                    'status': 'failed',
                    'message': 'IP enrichment failed for this lookup. Manual source capture is available.',
                    'fallback_available': True,
                    'item_count': 0,
                })
                ip_data = {}
        if ip_data:
            evidence_items.append({
                'id': f'ip:{ip_data["ip"]}',
                'kind': 'ip_enrichment',
                'title': f'IP network trace for {ip_data["ip"]}',
                'source_name': ip_data['source_name'],
                'source_category': 'ip_enrichment',
                'source_url': ip_data['source_url'],
                'detail': f'{ip_data.get("country") or "Unknown country"} · {ip_data.get("as_name") or "Unknown ASN"}',
                'risk_level': 'info',
                'confidence': 'provider',
                'captured_at': datetime.now(timezone.utc).isoformat(),
                'exposed_fields': [field for field in ['ip', 'asn', 'country'] if ip_data.get(field) or field == 'ip'],
                'action_label': 'Open provider record',
            })
            statuses.append({
                'provider': 'ipinfo',
                'label': 'IPinfo Lite',
                'status': 'completed',
                'message': f'Resolved network ownership and geography for {ip_data["ip"]}.',
                'fallback_available': False,
                'item_count': 1,
            })
        elif settings.IPINFO_TOKEN and not any(status['provider'] == 'ipinfo' for status in statuses):
            statuses.append({
                'provider': 'ipinfo',
                'label': 'IPinfo Lite',
                'status': 'no_match',
                'message': 'No IP enrichment data was returned for this address. Manual source capture is available.',
                'fallback_available': True,
                'item_count': 0,
            })

    search_bundle = await build_search_evidence(query)
    evidence_items.extend(search_bundle.items)
    statuses.extend(search_bundle.statuses)
    return ProviderEvidenceBundle(items=evidence_items, statuses=statuses)
