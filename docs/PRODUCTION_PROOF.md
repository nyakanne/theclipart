# Vindica Production Proof

This is a focused launch gate, not a claim that software can be made impossible to hack.

## Threats Covered

- Cross-account scan and report access returns `404` instead of revealing existence.
- Legacy anonymous data is hidden when production authentication is required.
- Saved action and manual-evidence payloads are encrypted at rest.
- Production refuses default database credentials, missing authentication, wildcard hosts, and missing KMS isolation.
- Remote image analysis blocks private/reserved networks, nonstandard ports, redirect pivots, non-image responses, and oversized downloads.
- Redis-backed quotas cap scans and provider-heavy lookup/image requests across API instances.
- Concurrent scans per account are capped.
- Unsigned Mailgun webhook requests are rejected.
- Metrics are hidden in production unless a metrics bearer token is configured.
- Backend, frontend, and Flower host ports bind to localhost instead of bypassing the edge proxy.

## Proof Command

```bash
scripts/production-proof.sh
```

## Required External Proof Before Launch

- Run authenticated two-account IDOR tests against the deployed Supabase project.
- Confirm `/ready` returns `ready`.
- Confirm direct public connections to ports `3000`, `5555`, and `8000` fail.
- Confirm provider billing alerts and hard monthly budgets are configured in each provider dashboard.
- Run database backup restore and account-deletion drills.
- Run a third-party penetration test before handling high-risk customer cases.
