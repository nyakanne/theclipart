# Agent Handoff — theclipart / vindica.me

Copy-paste this entire file to brief a new agent with full context.

---

## Project Identity

| Field | Value |
|---|---|
| Repo | `nyakanne/theclipart` |
| Domain | `vindica.me` |
| Server | Hetzner VPS `5.78.72.84` |
| Work branch | `feature/in-app-evidence` (also mirrored to `claude/push-codex-dataguard-fSWNC`) |
| Stack | React 18 + TypeScript + Vite (frontend) · FastAPI + Python (backend) · PostgreSQL + Redis · Docker Compose · Nginx |
| Purpose | Privacy/OSINT tool for victims of image abuse, stalking, and doxxing. Helps users find their exposed data, document evidence, and submit takedown requests. |

---

## What This App Does (User-Facing)

Tabs in the frontend (`/frontend/src/components/tabs/`):

| Tab file | What it does |
|---|---|
| `FindYourselfTab.tsx` | Auto-detects email/phone/name, runs full scan, shows breaches + broker exposure |
| `OsintTab.tsx` | 6 tools: Name Search, Username Search, IP Geolocation, Domain Lookup, Email Breach, Phone Lookup — all in-app |
| `ReverseImageTab.tsx` | Bing Visual Search (primary) + SauceNAO (fallback) — in-app reverse image search |
| `ImageSearchTab.tsx` | Image analysis: HF (free) → Azure CV fallback — captions, faces, objects, NSFW |
| `TrackHimTab.tsx` | Local evidence tracker — accounts, URLs, timeline, case notes, export for LE |
| `FingerprintTab.tsx` | SHA-256 hash generator (runs in browser, nothing leaves device) |
| `RemovalsTab.tsx` | Opt-out request tracker for data brokers |
| `EmailBlastTab.tsx` | CCPA/GDPR opt-out email templates |
| `PlatformReporterTab.tsx` | Legal report templates for platforms |
| `PoliceReportTab.tsx` | Police report builder (fully local) |

---

## Architecture

```
frontend (Vite/React)  →  Nginx  →  FastAPI backend
                                  →  PostgreSQL (user data, scans)
                                  →  Redis (Celery task queue)
                                  →  Celery workers (broker scans, opt-outs)
```

Backend entry: `backend/app/main.py`
Routers registered:
- `app.include_router(auth_router.router, prefix='/v1')`
- `app.include_router(scans_router.router, prefix='/v1')`
- `app.include_router(osint_router.router, prefix='/v1')`
- `app.include_router(webhooks_router.router, prefix='/v1')`

All API calls from frontend use `/api/v1/...` — Nginx proxies to backend.

---

## Auth

- Zustand store with persist middleware, localStorage key: `vindica-auth`
- Token shape: `{ state: { token: '...', user: {...} }, version: 0 }`
- Demo token (bypasses auth checks in dev): `demo-token-vindica`
- Backend skips auth header for demo token in OSINT endpoints

---

## Key Files

| File | Purpose |
|---|---|
| `backend/app/api/v1/osint.py` | All OSINT endpoints — see full list below |
| `backend/app/api/v1/scans.py` | Scan creation, status polling, results |
| `backend/app/core/config.py` | All settings + API key config with comments |
| `backend/requirements.txt` | Python deps (includes `phonenumbers==9.0.30`) |
| `frontend/src/components/tabs/OsintTab.tsx` | Main OSINT UI — all 6 tools, Brave evidence panels |
| `frontend/src/store/authStore.ts` | Zustand auth store |
| `frontend/src/types/index.ts` | Shared TS interfaces (HibpStatus, HibpEvidenceRow, etc.) |

---

## Backend Endpoints (osint.py)

| Method | Path | What it does | Requires |
|---|---|---|---|
| GET | `/v1/osint/username/{u}` | Probes 26 platforms concurrently (HEAD requests) | Nothing |
| GET | `/v1/osint/reverse-image?url=` | SauceNAO proxy, ≥40% similarity filter | Nothing |
| POST | `/v1/osint/visual-search` | Bing Visual Search — FormData: `file` or `image_url` | `AZURE_BING_KEY` |
| POST | `/v1/osint/analyze-image` | HF → Azure CV fallback, FormData: `file` or `image_url` | `HF_TOKEN` or `AZURE_CV_KEY+ENDPOINT` |
| GET | `/v1/osint/brave-search?q=&count=` | Brave web search — name/username/phone/email evidence | `BRAVE_SEARCH_API_KEY` |
| GET | `/v1/osint/domain-intel/{domain}` | VirusTotal + URLScan.io + Shodan concurrent | `VIRUSTOTAL_API_KEY`, `SHODAN_API_KEY` |
| GET | `/v1/osint/phone/{number:path}` | libphonenumber parse — country/carrier/line type/formats | Nothing (free) |

---

## Config / Environment Keys

File: `backend/app/core/config.py`

### Priority keys (fastest useful setup):

```env
# Unlocks: name/username/phone/email web evidence in all OSINT tabs
# Free: 2,000 queries/month — brave.com/search/api → sign up → API Keys
BRAVE_SEARCH_API_KEY=

# Unlocks: real email breach data and paste results
# Paid: ~$4/month — haveibeenpwned.com/API/Key
HIBP_API_KEY=

# Unlocks: image analysis (captions, objects, NSFW detection) — completely free
# Free: huggingface.co → Settings → Access Tokens → New token (read)
HF_TOKEN=
```

### Optional upgrade keys:

```env
# Domain tab — VirusTotal threat scores (free: 500/day)
VIRUSTOTAL_API_KEY=

# Domain tab — Shodan host/port/CVE intel (free API key at account.shodan.io)
SHODAN_API_KEY=

# Reverse image search — Bing Visual Search (free: 3,000/month via Azure)
AZURE_BING_KEY=

# Image analysis fallback if HF_TOKEN not set (free: 5,000/month via Azure)
AZURE_CV_KEY=
AZURE_CV_ENDPOINT=  # e.g. https://your-resource.cognitiveservices.azure.com
```

### Keys that live ONLY on the server .env — never in git:
- `GITHUB_CLIENT_SECRET=ae4e2170f95e14ebdf71d8f52b103defcc90c5ac`
- `POSTGRES_PASSWORD=vindica_db_pass_2026`

---

## What's Done

Every user-facing feature shows results inside the app. Nothing redirects for primary results.

- [x] Username Search — 26-platform probe grid, found/not_found/protected/error
- [x] Email Breach — POST `/v1/scans`, polls status, HIBP breach cards in-app
- [x] IP Geolocation — ipapi.co called from frontend, results grid in-app
- [x] Domain Lookup — RDAP + VirusTotal + URLScan.io + Shodan all in-app
- [x] Phone Lookup — libphonenumber (country/carrier/line type) + Brave web mentions
- [x] Name Search — new tool tab, Brave Search results in-app
- [x] Reverse Image — Bing Visual Search primary, SauceNAO fallback, both in-app
- [x] Image Analysis — HF (BLIP caption + DETR objects + NSFW) → Azure CV fallback
- [x] Brave evidence panels — fire concurrently on username/phone/email/name searches
- [x] Domain intel — VirusTotal scores + URLScan scan history with screenshots + Shodan ports/CVEs

---

## What's Pending / Could Be Next

- [ ] **Add API keys to server .env** — code is deployed and waiting. Add to `/home/user/theclipart/.env` on the server then `docker compose restart backend worker`
- [ ] **FindYourselfTab** — could add Brave evidence panel for name results
- [ ] **ReverseImageTab engine grid** — Google/Yandex/TinEye/PimEyes have no free APIs, currently still show as external links
- [ ] **HIBP paste results** — backend returns `paste_count` but frontend doesn't render paste detail cards yet
- [ ] **Scan history tab** — no tab shows past scans, could pull from `GET /v1/scans`

---

## How to Add Keys to the Server

```bash
ssh root@5.78.72.84
cd /home/user/theclipart
nano .env
# Add the keys, save, then:
docker compose restart backend worker
```

Or paste key values to the agent — it has shell access and can write the .env directly.

---

## Development Patterns

**Always build to verify TypeScript before committing:**
```bash
cd /home/user/theclipart/frontend && npm run build
```

**Push to both branches:**
```bash
git push origin feature/in-app-evidence
git push origin feature/in-app-evidence:claude/push-codex-dataguard-fSWNC
```

**Frontend API calls:**
```ts
fetch('/api/v1/osint/...', { headers: authHeaders() })
// authHeaders() → { 'Content-Type': 'application/json', 'Authorization': 'Bearer TOKEN' }
// Token from: useAuthStore(s => s.token)
```

**Backend settings:**
```python
from app.core.config import get_settings
settings = get_settings()  # lru_cached singleton
```

**Graceful degradation — every keyed endpoint works without the key:**
```python
if not settings.BRAVE_SEARCH_API_KEY:
    return {'available': False, 'results': [], 'query': q}
# Frontend checks data.available and shows setup prompt instead of error
```

---

## Commit Message Format

```
feat: short description

Longer explanation if needed.

https://claude.ai/code/session_01LYGVo9SNSU4r7GKUMsG6BF
```

---

## Security Rules (non-negotiable)

- NEVER commit `.env` to git
- NEVER commit `GITHUB_CLIENT_SECRET` or `POSTGRES_PASSWORD` to any file
- All OSINT tools use public data only — no private data, no unauthorized access
- The app is for victims documenting evidence, not for harassment or surveillance
