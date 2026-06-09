# Vindica Production Readiness

Updated: June 7, 2026

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
```

Run all Alembic migrations and verify signed-in scans return `vault_saved: true`.
Production startup intentionally refuses the development database password `secret`.

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
- Configure KMS envelope encryption for stronger production key isolation.
- Run authenticated end-to-end tests against the deployed Supabase and production database.
- Fix host nginx and deploy the current branch before live scans will work.
