#!/usr/bin/env python3
"""Exercise Vindica's free and configured provider paths without exposing secrets."""

from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))

from app.api.v1.lookups import lookup_domain, lookup_domain_intel, lookup_phone, lookup_username
from app.services.provider_evidence_service import build_provider_evidence


async def main() -> int:
    report: dict[str, object] = {}
    failures: list[str] = []

    phone = await lookup_phone('+14155552671', None)
    report['phone'] = {
        'valid': phone['valid'],
        'possible': phone['possible'],
        'country': phone['country'],
        'line_type': phone['line_type'],
        'timezones': phone['timezones'],
    }
    if phone['e164'] != '+14155552671' or not phone['possible']:
        failures.append('Phone metadata did not resolve the expected E.164 number.')

    username = await lookup_username('github', None)
    status_counts: dict[str, int] = {}
    for item in username:
        status = item['status']
        status_counts[status] = status_counts.get(status, 0) + 1
    report['username'] = {
        'attempted_platforms': len(username),
        'status_counts': status_counts,
    }
    if len(username) < 20:
        failures.append('Username lookup attempted fewer than 20 platforms.')

    domain = await lookup_domain('example.com', None)
    report['domain'] = domain
    if domain.get('error'):
        failures.append(f'RDAP domain lookup failed: {domain["error"]}')

    domain_intel = await lookup_domain_intel('example.com', None)
    report['domain_intel'] = {
        'urlscan_results': len(domain_intel['urlscan']),
        'virustotal_configured': domain_intel['available']['virustotal'],
        'shodan_configured': domain_intel['available']['shodan'],
        'virustotal_result': domain_intel['virustotal'] is not None,
        'shodan_result': domain_intel['shodan'] is not None,
    }

    proof_email = os.getenv('PROOF_EMAIL', 'test@example.com')
    email_bundle = await build_provider_evidence({'email': proof_email})
    report['email_evidence'] = {
        'items': len(email_bundle.items),
        'providers': email_bundle.statuses,
    }
    if not email_bundle.statuses:
        failures.append('Email evidence returned no provider coverage statuses.')

    report['status'] = 'passed' if not failures else 'failed'
    report['failures'] = failures
    print(json.dumps(report, indent=2, default=str))
    return 0 if not failures else 1


if __name__ == '__main__':
    raise SystemExit(asyncio.run(main()))
