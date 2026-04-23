"""
Model-Fingerprint Auditor (V1 feature)
Detects propensity / inference fields in broker data that suggest
the broker has trained ML models on scraped PII.
"""
from __future__ import annotations
import re

PROPENSITY_PATTERNS = [
    re.compile(r'\b(income|wealth|net ?worth|credit ?score|fico)\b', re.I),
    re.compile(r'\b(political|religion|ethnicity|race)\b', re.I),
    re.compile(r'\b(health|medical|insurance|prescri)\b', re.I),
    re.compile(r'\b(purchase ?predict|likely ?buyer|consumer ?segment)\b', re.I),
    re.compile(r'\b(inferred|predicted|estimated|modeled)\b', re.I),
]


def detect_propensity_fields(broker_listing: dict) -> list[str]:
    """
    Returns fields that appear to be ML-inferred / propensity-scored rather
    than directly collected from the subject.
    """
    flagged: list[str] = []
    for field_name in broker_listing.get('fields_exposed', []):
        for pat in PROPENSITY_PATTERNS:
            if pat.search(field_name):
                flagged.append(field_name)
                break
    return flagged


def fingerprint_audit(broker_listings: list[dict]) -> dict:
    """
    Run propensity detection across all broker listings.
    Returns audit summary for inclusion in the Regulator Ready-Pack.
    """
    findings = []
    for listing in broker_listings:
        flagged = detect_propensity_fields(listing)
        if flagged:
            findings.append({
                'broker_name': listing['broker_name'],
                'propensity_fields': flagged,
                'risk': 'high' if len(flagged) >= 3 else 'medium',
                'note': (
                    'This broker appears to expose inferred/modelled attributes. '
                    'Training AI on scraped PII without consent may violate GDPR Art. 22 '
                    'and CCPA § 1798.140(o)(1)(B).'
                ),
            })

    return {
        'total_brokers_audited': len(broker_listings),
        'brokers_with_propensity_fields': len(findings),
        'findings': findings,
    }
