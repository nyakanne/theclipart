"""
Compliance Scoring Engine
Evaluates GDPR / CCPA / PIPEDA violations across broker listings and breaches.
"""
from __future__ import annotations
from dataclasses import dataclass, field


@dataclass
class Violation:
    regulation: str
    article: str | None
    description: str
    severity: str
    broker_name: str | None = None


@dataclass
class ComplianceReport:
    overall: int
    gdpr_score: int
    ccpa_score: int
    risk_level: str
    violations: list[Violation] = field(default_factory=list)
    recommendations: list[str] = field(default_factory=list)


def _risk_level(score: int) -> str:
    if score >= 70:
        return 'low'
    if score >= 40:
        return 'medium'
    if score >= 20:
        return 'high'
    return 'critical'


def score_compliance(breaches: list[dict], broker_listings: list[dict]) -> ComplianceReport:
    violations: list[Violation] = []
    gdpr_penalty = 0
    ccpa_penalty = 0

    for b in broker_listings:
        if b.get('dsar_eligible') and b.get('opt_out_status') == 'not_started':
            violations.append(Violation(
                regulation='GDPR',
                article='Art. 17',
                description=f'{b["broker_name"]} holds your data without a confirmed erasure request.',
                severity='high',
                broker_name=b['broker_name'],
            ))
            gdpr_penalty += 10

        if b.get('opt_out_deadline_days') and b.get('opt_out_deadline_days', 0) > 30:
            violations.append(Violation(
                regulation='CCPA',
                article='§ 1798.105',
                description=f'{b["broker_name"]} has a deletion deadline exceeding CCPA\'s 45-day limit.',
                severity='medium',
                broker_name=b['broker_name'],
            ))
            ccpa_penalty += 5

    for breach in breaches:
        if breach.get('severity') in ('critical', 'high') and not breach.get('verified'):
            violations.append(Violation(
                regulation='GDPR',
                article='Art. 33',
                description=f'Unverified high-severity breach from {breach["source"]} — breach notification may be pending.',
                severity='medium',
            ))
            gdpr_penalty += 8

        if 'Passwords' in breach.get('exposed_fields', []):
            violations.append(Violation(
                regulation='GDPR',
                article='Art. 32',
                description=f'Password exposure in {breach["source"]} indicates inadequate encryption at rest.',
                severity='critical',
            ))
            gdpr_penalty += 20
            ccpa_penalty += 15

    gdpr_score = max(0, 100 - gdpr_penalty)
    ccpa_score = max(0, 100 - ccpa_penalty)
    overall = (gdpr_score + ccpa_score) // 2

    recommendations: list[str] = []
    if any(v.regulation == 'GDPR' and 'Art. 17' in (v.article or '') for v in violations):
        recommendations.append('Submit GDPR erasure requests (Art. 17) to all eligible brokers immediately.')
    if any('Passwords' in b.get('exposed_fields', []) for b in breaches):
        recommendations.append('Change passwords on all accounts — rotate any reused credentials.')
    if broker_listings:
        recommendations.append('Enable monitoring so new broker listings trigger automatic opt-out workflows.')
    recommendations.append('Review the Regulator Ready-Pack and file a complaint with your national DPA if violations persist.')

    return ComplianceReport(
        overall=overall,
        gdpr_score=gdpr_score,
        ccpa_score=ccpa_score,
        risk_level=_risk_level(overall),
        violations=violations,
        recommendations=recommendations,
    )
