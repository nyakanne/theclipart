# Vindica Production Readiness

Updated: June 9, 2026

## Implemented And Verified

- Account-scoped scans and command actions use Supabase bearer-token ownership.
- Submitted scan identifiers and provider snapshots are encrypted before database storage.
- Production authentication hides unowned legacy anonymous scans.
- Signed-in users can permanently delete all saved vault scans and linked records.
- Site-wide, versioned Terms, Privacy Policy, and authorized-use consent is required.
- Signed-in consent is synchronized into the account vault as an audit record.
- Real provider results render in-app, with honest unavailable/failed/no-match states.
- Scan progress advances through named stages and partial provider failures do not destroy successful results.
- Bulk opt-out queues only explicitly verified broker privacy contacts.
- Brokers without verified email contacts remain available through official opt-out portals.
- `/ready` reports production blockers and configured capabilities without exposing secrets.
- Redis-backed quotas cap scans and paid/provider-heavy lookups across API instances.
- Remote image URLs reject private networks, unsafe ports, redirect pivots, non-images, and oversized downloads.
- Saved command, consent, report, and manual-evidence payloads are encrypted at rest.
- Production requires KMS envelope encryption and runs backend workers as a non-root user.
- Backend, frontend, and Flower host ports bind to localhost to prevent edge-proxy bypass.

## Required Before Live Release

### Core Security And Vault

```dotenv
APP_ENV=production
REQUIRE_AUTH=true
SECRET_KEY=<strong unique secret>
POSTGRES_PASSWORD=<strong unique database password>
DATABASE_URL=postgresql+asyncpg://dataguard:<same encoded password>@postgres:5432/dataguard
SYNC_DATABASE_URL=postgresql://dataguard:<same encoded password>@postgres:5432/dataguard
SUPABASE_URL=<project URL>
SUPABASE_JWKS_URL=<project JWKS URL, or derive from SUPABASE_URL>
VITE_SUPABASE_URL=<project URL>
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key>
PUBLIC_APP_URL=https://vindica.me
CORS_ORIGINS=["https://vindica.me","https://www.vindica.me"]
ALLOWED_HOSTS=["vindica.me","www.vindica.me","localhost","127.0.0.1"]
KMS_KEY_ID=<production KMS key ARN>
REQUIRE_KMS_IN_PRODUCTION=true
METRICS_TOKEN=<strong monitoring-only bearer token>
```

Run all Alembic migrations and verify signed-in scans return `vault_saved: true`.
Production startup intentionally refuses the development database password `secret`.
Production startup does not create tables; migrations must complete before the API starts.

### Cost And Abuse Controls

```dotenv
MAX_ACTIVE_SCANS_PER_USER=2
API_REQUESTS_PER_5_MINUTES=300
SCANS_PER_DAY=10
EXPENSIVE_LOOKUPS_PER_HOUR=30
IMAGE_ANALYSES_PER_DAY=10
MAX_REMOTE_IMAGE_BYTES=5242880
```

Redis is required in production. If Redis is unavailable, cost-sensitive endpoints fail closed.
Configure billing alerts and hard monthly budgets in every paid provider dashboard.

### Live API Routing

Host nginx must preserve `/api`:

```nginx
location /api/ {
  proxy_pass http://127.0.0.1:8000;
}
```

A trailing slash on `proxy_pass` breaks frontend API requests.

### Real Results

Configure the providers the product promises:

```dotenv
IPINFO_TOKEN=
BRAVE_SEARCH_API_KEY=
HIBP_API_KEY=
VIRUSTOTAL_API_KEY=
SHODAN_API_KEY=
HF_TOKEN=
```

Image analysis can use Hugging Face, Google Cloud Vision, or Azure Computer Vision.

### Real Broker Email Delivery

```dotenv
ALLOW_REAL_OPT_OUTS=true
SES_FROM_EMAIL=<verified SES sender>
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
BROKER_PRIVACY_EMAILS={"spokeo.com":"<verified contact>"}
```

Only verified contacts belong in `BROKER_PRIVACY_EMAILS`. Vindica intentionally
refuses to guess `privacy@domain` addresses.

## Remaining Launch Work

- Verify broker privacy contacts and SES delivery outside the sandbox.
- Complete legal-counsel review of Terms, Privacy Policy, retention, subprocessors, and jurisdictional obligations.
- Decide and document retention periods; current self-service deletion is immediate and user initiated.
- Run authenticated end-to-end tests against the deployed Supabase and production database.
- Run `scripts/production-proof.sh` in CI and on the release host.
- Run a third-party penetration test before handling high-risk customer investigations.
- Fix host nginx and deploy the current branch before live scans will work.
