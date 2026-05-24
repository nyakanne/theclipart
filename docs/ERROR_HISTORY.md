# Vindica Error History

This file keeps a durable record of production issues, regressions, and cleanup work.
It is meant to answer four questions quickly:

1. What broke?
2. How did it present?
3. What was the actual root cause?
4. What fixed it?

Use this as an operational ledger, not marketing copy.

## Status key

- `fixed`: issue was resolved and verified
- `mitigated`: issue was reduced or worked around, but still needs follow-up
- `open`: issue is still active
- `cleanup`: not a production outage, but technical debt or structure work

## Incident log

| Date | Area | Symptom | Root Cause | Fix | Status |
| --- | --- | --- | --- | --- | --- |
| 2026-05-13 | Backend config | Backend crashed on startup with `ValidationError` for settings like `frontend_url`, `postgres_password`, `supabase_jwks_url`, and other env keys. | Pydantic settings model rejected extra environment fields being passed into the backend container. | Updated backend config handling so required runtime config was accepted instead of treated as forbidden extras. | `fixed` |
| 2026-05-13 | Datadog / backend boot | Backend failed with `ModuleNotFoundError: No module named 'wrapt'` during `ddtrace-run` startup. | Datadog tracing wrapper was still present in runtime commands, but the required tracing dependency chain was incomplete. | Removed stale `ddtrace-run` usage from live runtime path so backend starts directly under `uvicorn`. | `fixed` |
| 2026-05-13 | Auth verifier | Backend failed at startup with `RuntimeError: Set SUPABASE_JWT_SECRET when REQUIRE_AUTH=true.` | Production auth enforcement was enabled, but runtime verification config did not match Supabase setup. | Updated backend auth/config path to support Supabase JWKS-based verification instead of requiring only the legacy shared secret mode. | `fixed` |
| 2026-05-13 | Docker build | Backend/worker image build failed during `playwright install chromium --with-deps` because Debian packages like `ttf-unifont` and `ttf-ubuntu-font-family` were unavailable. | Base image mismatch caused Playwright dependency installation to target unsupported package names. | Pinned backend image to `python:3.12-slim-bookworm`, allowing Playwright browser dependency install to succeed. | `fixed` |
| 2026-05-13 | Database auth | Backend was unhealthy and `/api` returned `502`; logs showed `asyncpg.exceptions.InvalidPasswordError` for user `dataguard`. | Application database URLs and actual Postgres password drifted out of sync. | Reset the Postgres role password to match the deployed env values and restarted backend with aligned connection settings. | `fixed` |
| 2026-05-13 | Database schema init | Backend startup raised `duplicate key value violates unique constraint "pg_type_typname_nsp_index"` for `command_actions`. | App startup was trying to create schema objects that partially already existed, causing non-idempotent table/type creation behavior. | Worked around immediate outage so backend health recovered; schema bootstrap behavior still needs proper migration-only enforcement. | `mitigated` |
| 2026-05-13 | Health endpoint routing | `https://www.vindica.me/api/health` returned `404` while backend itself was healthy. | Actual health route is exposed at `/health`, not `/api/health`. | Confirmed and documented the correct health endpoint path. | `fixed` |
| 2026-05-13 | Frontend auth | Magic-link sign-in sent users back to `http://localhost:3000/account`. | Frontend build and/or Supabase redirect configuration still referenced local development URLs. | Updated frontend redirect handling to prefer `https://www.vindica.me/account` in production and documented required Supabase redirect allowlist entries. | `fixed` |
| 2026-05-14 | Frontend deploy | Premium redesign deployed, but account page showed `Supabase is not configured in this frontend build`. | The production frontend bundle was built without `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. | Rebuilt premium frontend with public Supabase envs baked in and redeployed. | `fixed` |
| 2026-05-14 | Dashboard persistence | Signed-in users could log in, but newly created scans did not appear in `/dashboard`. | Frontend bundle without Supabase envs created anonymous scans because no bearer token was attached to `POST /api/v1/scans`; backend saved those rows with `user_id = null`. | Rebuilt and redeployed frontend with working Supabase client initialization so signed-in scans carry auth and save with `user_id`. Old anonymous scans still require backfill if they should be claimed. | `fixed` |
| 2026-05-14 | Homepage product surface | Homepage used staged/demo framing despite request for live-result positioning. | Design iteration introduced cinematic “demo” language that conflicted with the real-product tone. | Removed demo framing and converted the section to a live-resolution surface using actual scan state and counts. | `fixed` |
| 2026-05-15 | Frontend structure | `frontend/src/pages/Home.tsx` grew into a 3,000+ line multi-purpose file carrying data, state, helpers, UI sections, and product logic. | Rapid iteration concentrated too much behavior into one page file. | Began extracting `home/types.ts`, `home/data.ts`, and `home/utils.ts` to reduce coupling and make follow-up refactors safer. | `cleanup` |
| 2026-05-17 | Evidence presentation | Scan results and lookup surfaces did not present a normalized “what was found / where it was found / open source” evidence trail. Phone and broker searches required manual interpretation of static resource lists. | Existing scan models were real, but the UI lacked a shared evidence layer and query-aware source links. | Added a normalized evidence feed derived from completed scan results and updated the lookup panel to generate source-scoped search links for the active query. | `fixed` |
| 2026-05-17 | IP enrichment path | IP geolocation/provider data existed as an idea and an external token, but not as a backend-owned product path. | There was no backend service or API endpoint for IPInfo-backed enrichment, so IP lookups could not be rendered as trusted product data. | Added backend IPInfo configuration, a provider adapter, a `/api/v1/lookups/ip/{value}` endpoint, and frontend lookup rendering for backend-resolved IP context. | `fixed` |
| 2026-05-17 | Placeholder result surfaces | Lookup and live-result views still mixed real scan output with staged checklist/tool-card UI and browser-generated preview rows. Users could not tell which rows were explicit evidence returned by the backend versus local scaffolding. | The interactive lookup page had not been converted from a manual “open these tools” workflow to a real scan-backed evidence view, and homepage browser-output rows still synthesized data before backend completion. | Reworked the lookup surface to launch real backend scans, render returned evidence items directly in browser, link to explicit source records, and removed synthetic preview rows from the live browser results panel. | `fixed` |
| 2026-05-17 | Local verification gap | The local browser could prove the IP lookup endpoint, but not the full scan-backed evidence flow, because the dev backend on port 8000 only exposed the lookup shim and scan creation still depended on Redis/Celery. | Local runtime had no simple eager/background scan mode, and the async engine config assumed networked databases instead of supporting SQLite for local proof runs. | Added a dev-safe inline scan mode, allowed SQLite-friendly async engine startup, and verified the real `/api/v1/scans` browser flow locally with explicit evidence rendering. | `fixed` |
| 2026-05-19 | Search-backed evidence breadth | Phone, name, username, and non-breach email scans still lacked provider-backed source URL evidence in the vault flow, even though IP evidence worked. | The scan pipeline had no broad search-provider adapter to turn indexed public pages into normalized evidence rows, so those identifiers depended on broker scraper hits alone. | Added a Brave Search-backed evidence adapter and merged it into the same provider evidence pipeline used by scan results and report generation. | `fixed` |
| 2026-05-19 | Provider fallback capture | When a provider was unconfigured, quota-limited, or simply returned no match, operators had no first-class way to preserve manually found sources inside the same scan/report flow. | Provider evidence was treated as all-or-nothing, and manual research findings had no scan-scoped import path back into `evidence_items`. | Added provider status diagnostics to scan results plus a manual evidence capture route that saves operator-found sources into the same scan, vault, and report pipeline. | `fixed` |
| 2026-05-19 | Report generation API | Creating a report could block or fail inside the API request path, and local verification still hit Redis/Celery expectations. | The report endpoint still behaved like a synchronous operation conceptually, and the running backend had not been converted into a proper queued job surface for browser polling. | Changed report generation into a queued `CommandAction` job with `POST /scans/{id}/report` returning `202` plus a pollable `GET /scans/{id}/report/{action_id}` status route. | `fixed` |
| 2026-05-19 | Report artifact storage | Completed report jobs failed with `Invalid type for parameter SSEKMSKeyId` when KMS/S3 configuration was incomplete in local/dev environments. | The upload path always sent KMS parameters to S3 and had no fallback storage path when cloud artifact configuration was unavailable. | Made KMS usage conditional, added local filesystem report fallback, and exposed an authenticated report download route so browser flows can still retrieve finished artifacts. | `fixed` |
| 2026-05-19 | Homepage evidence counts | The homepage stopped fabricating evidence rows, but its top-level exposure counters still padded category values from minimum defaults. That made live summaries look “real” even when only one provider item had come back. | `countsFromScanResult()` still used seeded minimums instead of deriving categories from returned `evidence_items`, broker rows, breach rows, and honey-token hits. | Reworked homepage count derivation to classify real returned evidence by kind/source category and compute total linked sources from actual result payloads. | `fixed` |
| 2026-05-19 | JSON report payload | Downloaded JSON reports leaked SQLAlchemy internals like `_sa_instance_state` inside the `compliance` block. | Report assembly serialized the ORM object with `vars(compliance)` instead of mapping to the public report shape. | Added an explicit compliance serializer for report generation so exported JSON matches the frontend/API contract without internal ORM fields. | `fixed` |
| 2026-05-19 | In-app image analysis gap | The reverse-image surface still depended on external launchers and had no backend-owned image-analysis API, so the “analyze in app” path the user asked for was unfinished. | The frontend had only local receipt capture plus external portal links; no Azure Computer Vision config, service, lookup route, API client, or typed browser result contract existed in the active workspace. | Added backend Azure image-analysis config/service/routes for URL and file upload, wired the frontend receipt panel to call them, and verified both direct backend and frontend-proxy routes return explicit typed `unavailable` responses when the provider is not configured. | `fixed` |
| 2026-05-21 | Single-provider image bottleneck | The reverse-image flow could only report Azure-shaped results, which left the browser with one provider lane and no durable fallback when Azure was absent. | Image analysis response contracts, lookup routes, and the browser panel were modeled as a single Azure result instead of an aggregated provider mesh. | Added backend aggregation for Google Cloud Vision, Azure Computer Vision, and Hugging Face Inference, widened the typed response contract to include per-provider results, and updated the browser panel to render aggregate plus provider-specific evidence/setup states. | `fixed` |

## Known follow-up items

These are not resolved just by recording them here.

| Area | Problem | Next action | Status |
| --- | --- | --- | --- |
| Frontend architecture | `Home.tsx` is still too large and contains too many embedded sections. | Extract remaining homepage sections into feature components under `frontend/src/pages/home/` or `frontend/src/components/home/`. | `open` |
| Feature duplication | The app still has overlapping scan surfaces between the homepage flow and older scan-related components. | Consolidate scan entrypoints and decide which scan UI is canonical. | `open` |
| Demo backend | `backend/app/api/v1/demo_scans.py` still exists and can confuse the production mental model. | Remove it, isolate it behind non-production routing, or document exactly why it still exists. | `open` |
| Database bootstrap | Schema creation behavior is not fully migration-safe. | Ensure production schema changes only run through Alembic migrations, not implicit startup table creation. | `open` |
| Dashboard backfill | Scans created while auth was broken may still have `user_id = null`. | Decide whether to backfill orphaned scans or leave them unattached. | `open` |
| Testing | Critical flows still lack real tests. | Add tests for signed-in scan creation, dashboard listing, auth token attachment, and extracted homepage utility functions. | `open` |

## Update procedure

When adding a new entry:

1. Use the date the issue was observed or fixed.
2. Describe the symptom as the operator saw it, not just the code-level exception.
3. Write the real root cause, not the first guess.
4. Record the exact class of fix applied.
5. Mark the status honestly.

If an issue reappears, add a new row instead of rewriting history.
