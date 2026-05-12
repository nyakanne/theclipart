# Vindica Handoff And Launch Transcript

Last updated: 2026-05-11

This document is a sanitized continuation guide for Vindica. It intentionally omits raw secrets, API keys, private keys, OAuth client secrets, database passwords, and service-role tokens. Any exposed credential from chat, screenshots, terminal output, or committed history should be rotated before public launch.

## Product Intent

Vindica is a survivor-centered privacy command center for people dealing with doxxing, cyberharassment, stalking, impersonation, non-consensual image exposure, data broker exposure, and breach fallout.

The product should feel like an in-browser intelligence dashboard, not a marketing page. The visual language is strict:

- Black / near-black backgrounds only.
- Red as the single accent color.
- No blue, green, purple, teal, orange, or yellow UI accents except where a status color is explicitly unavoidable.
- Obsidian / second-brain connection maps.
- Animated data-footprint graphs, radar sweeps, particle networks, and connected source cards.
- Every feature page should feel like a specialized internal command dashboard in the same visual system.
- Results must be displayed inside Vindica, with evaluated scores, exposure detail, source lists, compliance signals, removal actions, and exportable/reportable records.

## Safety Boundary

The actor/evidence feature must remain a legal evidence and reporting workflow only.

Allowed:

- Known accounts, URLs, usernames, public pages, screenshots, report numbers.
- Incident timeline, public OSINT links, platform report packets.
- Notes for police, platforms, attorneys, schools, employers, or federal agencies.
- Public IP geolocation only when supplied as evidence by the user.

Not allowed:

- Physical tracking.
- Private location tracking.
- Credential access.
- Doxxing, harassment, retaliation, deanonymization, or evading platform safeguards.
- Building tools that help target or stalk someone.

## Repository And Branch

- Repo: `https://github.com/nyakanne/theclipart`
- Working branch: `codex-dataguard-command-center`
- Production domain: `https://vindica.me`
- Server: Hetzner VPS at `5.78.72.84`
- Production repo path on server: `/var/www/vindica`

## Infrastructure State

The server has been provisioned and SSH access was fixed.

Current intended production stack:

- Nginx + Let's Encrypt for HTTPS.
- Docker Compose.
- FastAPI backend.
- PostgreSQL container.
- Redis container.
- Celery scan worker.
- Celery honey worker.
- Celery beat.
- Flower task monitor.
- Frontend container.
- Datadog agent.

Known server commands used:

```bash
cd /var/www/vindica
docker compose ps
docker compose logs backend --tail=60
docker compose build frontend
docker compose up -d frontend
docker compose --env-file backend/.env up -d
```

Important operational note: Docker Compose variable interpolation needs a root `.env` file as well as `backend/.env` unless the command uses `--env-file backend/.env`. To avoid confusion, keep these synchronized on the server:

```bash
cp /var/www/vindica/backend/.env /var/www/vindica/.env
```

## Deployment State

What has worked on the server:

- `https://vindica.me` serves the React frontend.
- Nginx SSL is configured.
- Docker is installed.
- PostgreSQL and Redis containers have reached healthy state.
- Backend has reached healthy state after fixing environment parsing and database password mismatch.
- Datadog agent has reached healthy state when a valid API key is configured.
- Frontend builds after recent TypeScript fixes.

Backend health path:

```bash
curl https://vindica.me/api/health
```

Expected:

```json
{"status":"ok","env":"production"}
```

Nginx currently forwards `/api/` to the backend unchanged, so the app expects backend routes under `/api/v1/...`. Example:

- Browser: `/api/v1/scans`
- Backend receives: `/api/v1/scans`

## Credentials Checklist

Do not commit any of these. Keep them only in server `.env`, hosting dashboards, or a password manager.

- `SECRET_KEY`
- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`
- `FLOWER_PASSWORD`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `DD_API_KEY`
- `VITE_DD_APPLICATION_ID`
- `VITE_DD_CLIENT_TOKEN`
- `MAILGUN_API_KEY`
- `HIBP_API_KEY`
- Supabase secret key
- Supabase service role key
- Supabase legacy JWT secret, if the project still uses the shared-secret auth system
- AWS keys, KMS key ID, SES credentials, S3 credentials
- Hetzner root password or SSH private key

Credentials known to have appeared in chat or screenshots should be rotated:

- GitHub personal access token.
- Datadog API keys.
- Supabase service role key.
- Mailgun API key.
- GitHub OAuth client secret.
- SSH private key.
- Server root password.

## Supabase Auth Setup

For the current Supabase JWT signing-key system, use the Key Details modal:

```bash
REQUIRE_AUTH=true
SUPABASE_JWKS_URL=https://your-project-ref.supabase.co/auth/v1/.well-known/jwks.json
SUPABASE_JWT_AUDIENCE=authenticated
```

Copy the Discovery URL into `SUPABASE_JWKS_URL`. Do not paste the public key JSON into `.env`. If the project still uses the legacy shared JWT secret, leave `SUPABASE_JWKS_URL` blank and set `SUPABASE_JWT_SECRET` instead.

For the frontend build, set:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key>
```

Supabase secret keys and service-role keys are backend-only and must never be baked into the Vite frontend bundle.

## GitHub OAuth Setup

GitHub OAuth App should be configured as:

- Name: `Vindica`
- Homepage URL: `https://vindica.me`
- Callback URL: `https://vindica.me/api/v1/auth/github/callback`

Server environment must include:

```bash
GITHUB_CLIENT_ID=<from GitHub OAuth app>
GITHUB_CLIENT_SECRET=<from GitHub OAuth app>
GITHUB_REDIRECT_URI=https://vindica.me/api/v1/auth/github/callback
```

Restart backend after updating:

```bash
cd /var/www/vindica
docker compose restart backend
```

## Backend Issues Fixed Or Investigated

- CORS parsing failed because `CORS_ORIGINS` had to be valid list syntax for production.
- The backend image had stale `.env` parsing behavior, so config was changed to rely on environment values rather than a baked-in `.env` inside the image.
- Production startup blocked on AWS KMS, AWS secrets, and HIBP. These checks were relaxed for launch so the app can boot while integrations are added.
- PostgreSQL password mismatch caused backend startup failure. The `dataguard` role password was updated inside Postgres.
- Alembic saw `scan_status` already existed. Database was stamped to current head after confirming schema was present.
- Nginx returned frontend HTML for `/api/...` until `/api/` proxying was added.
- Nginx proxies `/api/...` to the FastAPI backend.
- Backend route prefix is `/api/v1/...`, matching browser requests.

## Frontend Work Completed

The UI has been repeatedly moved toward the requested Vindica/DataGuard aesthetic:

- Rebranded from DataGuard/Phantom to Vindica in major UI areas.
- Built a dark red animated landing page with radar graph and floating exposure cards.
- Added `NetworkGraph` with animated particles, red connection lines, and floating category cards.
- Built full command center tabs:
  - Scan / Exposure Dashboard
  - Find Yourself
  - OSINT Tools
  - Reverse Image
  - Image Search
  - Opt-Out Queue
  - Email Blast
  - Platform Reporter
  - Fingerprint
  - Police Report
  - Legal Signals
  - Evidence Tracker
- Added a shared DataGuard/Vindica-style page hero pattern.
- Purged off-brand colors from many tabs.
- Rebranded localStorage keys away from `dataguard-*` toward `vindica-*`.
- Reworked Removals dashboard with progress, broker gauge, pending actions, monitoring status, and alerts feed.
- Reworked Scan dashboard with score, KPI cards, exposure map, breach table, broker table, and compliance cards.

## Current UX Gap

The user still expects a stronger, more consistent internal dashboard experience across every feature:

- The landing page should immediately show a Vindica-branded animated data-footprint / second-brain graph.
- Every feature tab should look like a version of the supplied red/black mockups, not a generic card grid.
- Scan results should be explicit and evaluative:
  - privacy score,
  - exposure score,
  - risk level,
  - breach list,
  - broker list,
  - source categories,
  - compliance signals,
  - recommended next action,
  - report/export actions.
- The scan should not feel prefilled or fake. If a real integration is not configured, the UI must clearly label it as simulated/demo rather than pretending real data was found.
- Dashboard state should show where data goes:
  - frontend submits scan payload to backend,
  - backend creates a scan row,
  - Celery worker processes broker/breach checks,
  - results are stored in Postgres,
  - frontend polls status and renders results.

## Required Real Integrations

For a fully public, non-demo launch:

- HIBP API key for real breach lookup.
- Broker scan pipeline using Celery + Playwright.
- Mailgun or AWS SES configured and verified for outbound emails.
- `ALLOW_REAL_OPT_OUTS=false` until outbound email/domain verification is complete and tested.
- Supabase can be used for hosted Postgres/auth if we choose managed DB, but current Docker path runs local Postgres.
- Datadog APM/RUM configured with rotated keys.
- GitHub OAuth configured with rotated OAuth secret.

## Known Risks

- Several secrets were exposed during setup. Rotate before launch.
- The server `.env` was edited manually and may differ from local docs. Treat server state as source of truth until reconciled.
- Docker Compose currently warns that the `version` key is obsolete. Not fatal.
- Some production code changes were made directly on the server during debugging and need to be reconciled into git if not already committed.
- The UI has improved but still needs a design pass to make every tab feel like the supplied mockups.
- If `HIBP_API_KEY` is empty, breach checks should be clearly marked as unavailable or simulated.
- If `ALLOW_REAL_OPT_OUTS=false`, the product must not claim emails or opt-outs were actually submitted.

## Verification Commands

Frontend:

```bash
cd frontend
npm run build
```

Server:

```bash
cd /var/www/vindica
docker compose ps
curl https://vindica.me/api/health
docker compose logs backend --tail=60
docker compose logs worker-scans --tail=60
```

Auth:

```bash
curl -I https://vindica.me/api/v1/auth/github
```

Expected: redirect to GitHub if OAuth is configured.

Scan:

```bash
curl -s https://vindica.me/api/health
```

Then test from browser after login:

1. Open `https://vindica.me`.
2. Click GitHub login.
3. Run a scan with name/email/phone/username.
4. Confirm an in-app privacy score and exposure dashboard render.
5. Confirm results remain stored and can be reopened.

## Immediate Next Steps

1. Rotate all exposed secrets.
2. Reconcile server `.env` and root `.env`; keep both out of git.
3. Confirm GitHub OAuth works end-to-end.
4. Confirm backend health and scan route work through nginx.
5. Decide whether production DB is local Postgres or Supabase, then remove the other path from launch instructions to avoid confusion.
6. Make Scan results truthful:
   - real HIBP when key exists,
   - clear unavailable/simulated labels when missing.
7. Build a true Vindica internal-dashboard design system:
   - one PageShell,
   - one DataPanel,
   - one MetricTile,
   - one ExposureGraph,
   - one EvidenceTable,
   - one ActionQueue.
8. Apply that system to every tab.
9. Add smoke tests:
   - frontend build,
   - backend config load,
   - `/health`,
   - GitHub auth redirect,
   - scan create/status/result happy path.
10. Create PR from `codex-dataguard-command-center` into the target branch.

## PR Summary Draft

Title:

```text
Launch Vindica privacy command center
```

Body:

```markdown
## Summary
- Rebrands the privacy command center to Vindica.
- Adds red/black animated command-center UI across landing, scan, removals, evidence, OSINT, reporting, image search, fingerprinting, and opt-out workflows.
- Wires Docker/VPS production stack with FastAPI, Postgres, Redis, Celery workers, Flower, nginx, and Datadog.
- Adds GitHub OAuth support and production domain routing for `vindica.me`.
- Adds deployment guidance and a sanitized handoff document.

## Verification
- `cd frontend && npm run build`
- Server checks:
  - `docker compose ps`
  - `curl https://vindica.me/api/health`

## Security Notes
- No raw secrets are committed.
- Exposed credentials from setup/chat should be rotated before public launch.
- `ALLOW_REAL_OPT_OUTS` must stay false until outbound email/domain verification is complete.
```
