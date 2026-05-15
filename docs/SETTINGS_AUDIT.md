# Vindica Settings Audit

This document separates:

- what is already a proper setting
- what should become a setting soon
- what should remain code/data and not be over-configured

The goal is to reduce hidden production behavior and make deployments predictable.

## Good: already configurable

These are already in a reasonable place.

### Backend runtime settings

Defined in [backend/app/core/config.py](/Users/anneshirleynyako/Documents/Codex/2026-04-27/https-github-com-nyakanne-theclipart-git/backend/app/core/config.py):

- `APP_ENV`
- `DEMO_MODE`
- `SECRET_KEY`
- `CORS_ORIGINS`
- `DATABASE_URL`
- `SYNC_DATABASE_URL`
- `REDIS_URL`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `S3_BUCKET`
- `KMS_KEY_ID`
- `SES_FROM_EMAIL`
- `PUBLIC_APP_URL`
- `ALLOW_REAL_OPT_OUTS`
- `REQUIRE_AUTH`
- `SUPABASE_JWT_SECRET`
- `SUPABASE_JWKS_URL`
- `SUPABASE_JWT_AUDIENCE`
- `HIBP_API_KEY`
- `HONEY_DOMAIN`
- `MAILGUN_API_KEY`
- `MAX_CONCURRENT_PLAYWRIGHT`
- `SCAN_TIMEOUT_SECONDS`
- `BROKER_LIST_PATH`

### Frontend auth settings

Used in [frontend/src/services/supabase.ts](/Users/anneshirleynyako/Documents/Codex/2026-04-27/https-github-com-nyakanne-theclipart-git/frontend/src/services/supabase.ts) and wired in [frontend/Dockerfile](/Users/anneshirleynyako/Documents/Codex/2026-04-27/https-github-com-nyakanne-theclipart-git/frontend/Dockerfile):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_ANON_KEY`

### Compose-level deployment settings

In [docker-compose.yml](/Users/anneshirleynyako/Documents/Codex/2026-04-27/https-github-com-nyakanne-theclipart-git/docker-compose.yml):

- `PUBLIC_APP_URL`
- `CORS_ORIGINS`
- `REQUIRE_AUTH`
- `SES_FROM_EMAIL`
- `HONEY_DOMAIN`
- frontend `VITE_*` variables

## Should become settings soon

These are the places where behavior is still too hardcoded.

### 1. Frontend API timeout

Current:

- [frontend/src/services/api.ts](/Users/anneshirleynyako/Documents/Codex/2026-04-27/https-github-com-nyakanne-theclipart-git/frontend/src/services/api.ts): `timeout: 30_000`

Why it should be configurable:

- local dev, staging, and production may want different client timeout tolerances
- long-running scan/report requests may need different thresholds

Recommended setting:

- `VITE_API_TIMEOUT_MS`

### 2. Frontend polling intervals

Current:

- [frontend/src/hooks/useScan.ts](/Users/anneshirleynyako/Documents/Codex/2026-04-27/https-github-com-nyakanne-theclipart-git/frontend/src/hooks/useScan.ts): `POLL_INTERVAL = 2500`
- [frontend/src/pages/Dashboard.tsx](/Users/anneshirleynyako/Documents/Codex/2026-04-27/https-github-com-nyakanne-theclipart-git/frontend/src/pages/Dashboard.tsx): `refetchInterval: 5000`

Why it should be configurable:

- these are operational tuning knobs
- they affect server load and dashboard responsiveness

Recommended settings:

- `VITE_SCAN_POLL_INTERVAL_MS`
- `VITE_DASHBOARD_REFRESH_MS`

### 3. Frontend public app URL for auth redirects

Current:

- [frontend/src/pages/Account.tsx](/Users/anneshirleynyako/Documents/Codex/2026-04-27/https-github-com-nyakanne-theclipart-git/frontend/src/pages/Account.tsx) uses `VITE_PUBLIC_APP_URL` if present, then falls back to hostname checks for `vindica.me`.

Why it should be cleaner:

- production redirect behavior should come from one explicit public URL
- hostname-based fallback is okay as a safety net, but not ideal as the main production rule

Recommended setting:

- keep `VITE_PUBLIC_APP_URL`
- prefer it consistently in production builds

### 4. Backend report generation wait timeout

Current:

- [backend/app/api/v1/scans.py](/Users/anneshirleynyako/Documents/Codex/2026-04-27/https-github-com-nyakanne-theclipart-git/backend/app/api/v1/scans.py): `generate_report.delay(...).get(timeout=120)`

Why it should be configurable:

- report generation time may vary by environment and workload

Recommended setting:

- `REPORT_TASK_TIMEOUT_SECONDS`

### 5. External HTTP timeouts

Current:

- [backend/app/services/breach_checker.py](/Users/anneshirleynyako/Documents/Codex/2026-04-27/https-github-com-nyakanne-theclipart-git/backend/app/services/breach_checker.py): `timeout=15`
- [backend/app/core/auth.py](/Users/anneshirleynyako/Documents/Codex/2026-04-27/https-github-com-nyakanne-theclipart-git/backend/app/core/auth.py): `timeout=10.0`
- [backend/app/workers/tasks.py](/Users/anneshirleynyako/Documents/Codex/2026-04-27/https-github-com-nyakanne-theclipart-git/backend/app/workers/tasks.py): Mailgun event timeout `10`

Why it should be configurable:

- network conditions and external API behavior differ between environments
- retry and timeout tuning should not require code edits

Recommended settings:

- `EXTERNAL_HTTP_TIMEOUT_SECONDS`
- or separate:
  - `HIBP_TIMEOUT_SECONDS`
  - `SUPABASE_JWKS_TIMEOUT_SECONDS`
  - `MAILGUN_TIMEOUT_SECONDS`

### 6. Playwright worker timing defaults

Current:

- [backend/app/workers/playwright_worker.py](/Users/anneshirleynyako/Documents/Codex/2026-04-27/https-github-com-nyakanne-theclipart-git/backend/app/workers/playwright_worker.py) has hardcoded waits like `2000`, `5000`, and internal browser launch behavior.

Why it should be configurable:

- scraping stability differs by host size and browser runtime conditions

Recommended settings:

- `PLAYWRIGHT_NAV_TIMEOUT_MS`
- `PLAYWRIGHT_WAIT_FOR_SELECTOR_MS`
- `PLAYWRIGHT_POST_NAV_DELAY_MS`

### 7. Healthcheck cadence and compose health timeouts

Current:

- [docker-compose.yml](/Users/anneshirleynyako/Documents/Codex/2026-04-27/https-github-com-nyakanne-theclipart-git/docker-compose.yml) hardcodes healthcheck intervals, retries, and timeouts.

Why it may deserve configuration:

- not urgent, but useful for different VPS sizes or environments

Recommended settings:

- only if you actively tune across environments; otherwise leave in compose

## Should likely stay code or structured data

These should not be turned into environment variables unless there is a strong reason.

### 1. Static product content and UI copy

Examples:

- command-center labels
- threat feed presentation copy
- account page headings

These belong in source or content files, not env vars.

### 2. Curated broker lists and resource catalogs

Examples:

- [frontend/src/pages/home/data.ts](/Users/anneshirleynyako/Documents/Codex/2026-04-27/https-github-com-nyakanne-theclipart-git/frontend/src/pages/home/data.ts)
- [backend/app/api/v1/demo_scans.py](/Users/anneshirleynyako/Documents/Codex/2026-04-27/https-github-com-nyakanne-theclipart-git/backend/app/api/v1/demo_scans.py)
- [backend/app/workers/playwright_worker.py](/Users/anneshirleynyako/Documents/Codex/2026-04-27/https-github-com-nyakanne-theclipart-git/backend/app/workers/playwright_worker.py)

These should be moved into structured data files or database tables if we need admin editing, but not into env vars.

Best long-term shape:

- `backend/data/brokers.json`
- `frontend/src/data/resources.ts`

### 3. Visual design constants

Examples:

- colors
- animation durations
- CSS waveforms

These are design tokens, not runtime settings.

They belong in:

- CSS variables
- theme files
- Tailwind config

### 4. Scan heuristics used only for frontend preview

Examples:

- `deriveExposureCounts`
- `operatorConfidence`
- `operatorSeverity`

These are product logic. They should be tested and centralized, but not exposed as env settings unless ops truly needs to tune them live.

## Current drift / risks

### Account redirect logic is split

- frontend uses `VITE_PUBLIC_APP_URL` if present
- backend uses `PUBLIC_APP_URL`
- compose also defines `PUBLIC_APP_URL`

This is workable, but it is easy for frontend and backend public URLs to drift.

Recommendation:

- standardize on one deployment source of truth
- derive `VITE_PUBLIC_APP_URL` from deployment config at build time

### Demo and production source lists are separate

- frontend broker/resources list
- backend demo broker list
- backend Playwright broker definitions

These will drift over time.

Recommendation:

- move broker metadata into one structured shared source

## Highest-value next changes

If we only do a few things, do these:

1. Add `VITE_API_TIMEOUT_MS`
2. Add `VITE_SCAN_POLL_INTERVAL_MS`
3. Add `VITE_DASHBOARD_REFRESH_MS`
4. Add `REPORT_TASK_TIMEOUT_SECONDS`
5. Centralize broker/resource data into structured files
6. Standardize public app URL handling across frontend/backend

## Bottom line

The app is not wildly under-configured anymore, but there are still a few operational values hardcoded in places that should be tunable:

- timeouts
- polling intervals
- public URL handling
- browser worker wait thresholds

The larger problem is not missing env vars everywhere. It is duplicated structured data and too much behavior embedded directly in UI files.
