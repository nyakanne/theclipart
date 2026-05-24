from __future__ import annotations

from ipaddress import ip_address

import httpx

from app.core.config import get_settings

settings = get_settings()


def normalize_ip(value: str) -> str:
    return str(ip_address(value.strip()))


async def lookup_ipinfo(value: str) -> dict:
    if not settings.IPINFO_TOKEN:
        return {}

    ip = normalize_ip(value)
    url = f'{settings.IPINFO_BASE_URL.rstrip("/")}/{ip}'
    headers = {'Authorization': f'Bearer {settings.IPINFO_TOKEN}'}

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()

    return {
        'ip': data.get('ip', ip),
        'network': data.get('network'),
        'asn': data.get('asn'),
        'as_name': data.get('as_name'),
        'as_domain': data.get('as_domain'),
        'country_code': data.get('country_code'),
        'country': data.get('country'),
        'continent_code': data.get('continent_code'),
        'continent': data.get('continent'),
        'is_anycast': bool(data.get('anycast', False)),
        'is_bogon': bool(data.get('bogon', False)),
        'source_name': 'IPinfo Lite',
        'source_url': f'https://ipinfo.io/{ip}',
    }
