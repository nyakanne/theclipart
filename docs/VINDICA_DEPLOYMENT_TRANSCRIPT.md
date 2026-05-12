# Vindica Deployment Transcript And Status

Last updated: 2026-05-11T19:48:52Z
Active branch: `codex-dataguard-command-center`
Production domain: `https://vindica.me`
Production server: Hetzner CPX21 at `5.78.72.84`
Repository: `https://github.com/nyakanne/theclipart`

This document is a safe handoff transcript for continuing the Vindica launch with another agent or engineer. It intentionally does not include live secrets, API keys, OAuth client secrets, database passwords, SSH keys, or Mailgun/Datadog keys.

## Product Intent

Vindica is a survivor-centered privacy command center inspired by the original red/black DataGuard dashboard mockups, but branded as Vindica. The app should feel like an in-browser intelligence dashboard, not a landing-page template.

Core purpose:

- Scan for personal-data exposure by name, email, phone, and username.
- Display exposure results inside the platform with a privacy score, breach records, broker records, opt-out links, legal/compliance signals, and evidence workflows.
- Help users organize one-stop opt-outs, platform reports, police reports, reverse image search, NCII resources, and public OSINT evidence.
- Keep the “Track Him” capability as safe evidence tracking only: known accounts, URLs, reports, timeline, screenshots, case notes, and authority reporting.
- Do not build physical tracking, credential access, doxxing, harassment, private-location tracking, or deanonymization features.

## Visual Requirements

The desired theme is based on the provided dashboard mockups:

- Black and near-black surfaces.
- Red as the only brand accent.
- No blue, green, yellow, teal, purple, orange, or rainbow product accents.
- Internal command-center dashboards on every feature page.
- Animated “second brain” / Obsidian-style graph connections.
- Large, explicit results panels rather than plain link lists.
- Landing page should be Vindica branded, while borrowing the structure and feel of the provided red/black privacy dashboard screenshots.

Current source status:

- User-facing legacy `DataGuard` strings have been replaced with `Vindica`.
- The remaining frontend source scan found no `blue-`, `green-`, `yellow-`, `purple-`, `indigo-`, `teal-`, or `orange-` Tailwind classes under `frontend/src`.
- Build passed locally after installing frontend dependencies.

## Major Work Completed

### Branding And Theming

- Rebranded the experience from DataGuard/Phantom language toward Vindica.
- Added a Vindica landing page with:
  - Animated red radar canvas.
  - Connected floating category cards.
  - Dark command-center hero layout.
  - Scan input surface.
- Added a shared `PageHeader` pattern for tab pages.
- Reworked feature tabs toward a single red/black visual language.

### Frontend Command Center

The command center includes these major tabs and workflows:

- Dashboard / Scan
- Find Yourself
- Reverse Image Search
- Image Search
- Opt-Out Queue
- Email Blast
- Platform Reporter
- Fingerprint
- Police Report
- Legal Signals / Reports
- Evidence Tracker
- OSINT Tools

### Dashboard / Scan

Implemented and iterated on:

- Privacy score gauge.
- KPI cards.
- Animated exposure map.
- Broker and breach result tables.
- Compliance/legal signals.
- In-browser display of scan results instead of only external links.
- Scan request flow using `/api/v1/scans` from the frontend.
- Frontend auth headers for scan calls.

Important proxy detail:

- Browser calls `https://vindica.me/api/v1/...`
- nginx forwards `/api/...` to the backend unchanged.
- FastAPI routers are mounted at `/api/v1`.

### Backend And Infrastructure

Completed or configured:

- Docker installed on the Hetzner server.
- Docker Compose stack built and launched.
- PostgreSQL container is running.
- Redis container is running.
- Backend container is running and passed `/health`.
- Celery beat, scan worker, honey worker were started.
- Datadog agent was started and reported healthy after API key configuration.
- nginx serves `https://vindica.me` with Let’s Encrypt SSL.
- nginx API proxy was fixed so `https://vindica.me/api/health` returns backend JSON.
- Database migration state was stamped to `0002 (head)` after schema already existed.
- PostgreSQL password mismatch was fixed by altering the `dataguard` DB user password to match env.

### Auth

GitHub OAuth app was created for Vindica.

OAuth callback must be:

```text
https://vindica.me/api/v1/auth/github/callback
```

The server `.env` and root `.env` must both contain the GitHub client id and secret. Do not commit these values.

Supabase Auth can verify user access tokens using either the current JWT signing-key Discovery URL or the legacy shared JWT secret. Prefer the Discovery URL from Supabase Auth -> Signing Keys:

```bash
REQUIRE_AUTH=true
SUPABASE_JWKS_URL=https://your-project-ref.supabase.co/auth/v1/.well-known/jwks.json
SUPABASE_JWT_AUDIENCE=authenticated
```

Do not paste the public key JSON into `.env`; the backend fetches that JWKS endpoint and caches it.

### Secrets And Safety

Secrets have been shared during the work and should be treated as exposed. Rotate before serious public launch:

- GitHub OAuth client secret.
- Mailgun API key.
- Datadog API key.
- Any generated server/database/Redis/Flower passwords shared in chat.
- Any private SSH key that was pasted.

Keep real values only in:

- `/var/www/vindica/.env` on the server.
- `/var/www/vindica/backend/.env` on the server.
- A local password manager.
- Provider dashboards.

Never commit `.env`, `.env.local`, `.env.production`, API keys, OAuth secrets, private keys, or service role keys.

## Production Server State

Server path:

```bash
/var/www/vindica
```

Production pull/build commands:

```bash
cd /var/www/vindica
git pull origin codex-dataguard-command-center
docker compose build frontend
docker compose up -d frontend
```

Full stack status command:

```bash
cd /var/www/vindica
docker compose ps
```

Backend logs:

```bash
cd /var/www/vindica
docker compose logs backend --tail=80
```

Backend health through nginx:

```bash
curl -s https://vindica.me/api/health
```

Expected:

```json
{"status":"ok","env":"production"}
```

## Current Known Issues / Risks

1. GitHub OAuth must be verified end to end after the latest `.env` updates.
2. Full real breach results require a real HIBP API key.
3. Real automated opt-out sending must remain disabled until sender/domain verification is complete.
4. `ALLOW_REAL_OPT_OUTS` must stay `false` until email delivery is tested and legally reviewed.
5. Some backend internals still use `dataguard` as the database/service name. This is internal only and can be renamed later, but it is not required for functionality.
6. The server `.env` and `backend/.env` need to stay in sync because Docker Compose interpolation reads root `.env`, while the backend also uses `backend/.env` conventions from earlier setup.
7. Any values previously pasted into chat should be rotated before a true public launch.

## Deployment Checklist

- [x] Domain purchased: `vindica.me`
- [x] DNS pointed to Hetzner server: `5.78.72.84`
- [x] SSH access restored
- [x] nginx installed
- [x] SSL issued for `vindica.me`
- [x] Docker installed
- [x] Compose stack launched
- [x] Backend health reachable through nginx
- [x] Frontend rebuilt and deployed
- [x] Red/black theme pass completed
- [x] GitHub OAuth app created
- [ ] Rotate exposed secrets
- [ ] Verify GitHub login in browser
- [ ] Add HIBP API key
- [ ] Decide whether to use local Postgres or Supabase long-term
- [ ] Configure verified email sender for Mailgun/SES
- [ ] Keep `ALLOW_REAL_OPT_OUTS=false` until email verification and legal review are complete
- [ ] Run an end-to-end scan from `https://vindica.me`
- [ ] Confirm scan result records persist and display in-app
- [ ] Confirm Flower access is secured
- [ ] Confirm Datadog receives backend traces/logs

## Functional Expectations

The public app should not feel like a mock. It should:

- Accept a scan input for name/email/phone/username.
- Show a privacy score.
- Show explicit exposure results in the platform.
- Show breach records and source details.
- Show broker records and opt-out actions.
- Show compliance/legal signal panels.
- Provide copyable report packets.
- Persist opt-out/evidence/report state where appropriate.
- Use the same Vindica red/black dashboard visual language across all pages.

## Useful Commands For Next Agent

Local verification:

```bash
cd frontend
npm install
npm run build
```

Server deploy:

```bash
ssh root@5.78.72.84
cd /var/www/vindica
git pull origin codex-dataguard-command-center
docker compose build frontend backend
docker compose up -d
docker compose ps
curl -s https://vindica.me/api/health
```

Check backend route availability:

```bash
curl -s http://127.0.0.1:8000/health
curl -I https://vindica.me/api/health
```

Check nginx config:

```bash
nginx -t && systemctl reload nginx
```

## High-Level Execution Timeline

1. Started with the existing DataGuard/The Clipart repo.
2. Created/used deployment branch `codex-dataguard-command-center`.
3. Built a red/black privacy command center concept.
4. Rebranded toward Phantom, then settled on Vindica.
5. Purchased/used `vindica.me`.
6. Created Hetzner server and resolved SSH/login issues.
7. Installed nginx, certbot, Node, Docker.
8. Issued SSL for `vindica.me`.
9. Deployed static frontend first.
10. Realized backend was required for functioning scans/auth.
11. Launched Docker Compose stack.
12. Fixed env loading and CORS parsing.
13. Fixed backend route prefix vs nginx `/api` proxy mismatch.
14. Fixed database password mismatch.
15. Stamped migrations to head after schema already existed.
16. Rebuilt dashboard and feature pages toward the strict red/black mockup aesthetic.
17. Added this transcript/status handoff document.

## What To Do Next

Immediate:

1. Rotate exposed secrets.
2. Confirm root `.env` and `backend/.env` on the server contain the same required production values.
3. Restart backend after OAuth secret update.
4. Test GitHub login.
5. Run a scan and capture the actual response payload.
6. If results still do not display as expected, inspect `frontend/src/components/tabs/ScanTab.tsx` against the backend response shape and patch mapping.

Near-term:

1. Add HIBP API key for real breach checks.
2. Wire broker scan results into in-app dashboard tables.
3. Add persistent database-backed opt-out/evidence/report storage instead of localStorage-only workflows.
4. Add server-side report generation/export.
5. Add visual regression screenshots for landing, dashboard, scan results, removals, reports, and evidence pages.
