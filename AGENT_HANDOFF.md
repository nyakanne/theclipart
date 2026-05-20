# Agent Handoff — Vindica (theclipart)

**Repo:** `nyakanne/theclipart`
**Branch:** `claude/push-codex-dataguard-fSWNC`
**Stack:** React 18 + TypeScript + Vite frontend · FastAPI Python backend · Docker Compose
**Server:** Hetzner VPS 5.78.72.84 · domain vindica.me

---

## Core Directive (from user)

> "When someone searches a name or email or whatever, we want the data to be presented in-app instead of leading them outside the app — for everything, from every feature I want only real data and evidence."

All features must show real results inside the app. No "open these links" launchers.

---

## What's Done (all committed and pushed)

### Backend
| File | What changed |
|------|-------------|
| `backend/app/api/v1/osint.py` | **NEW** — two endpoints: `GET /v1/osint/username/{u}` (probes 26 platforms via httpx HEAD, returns found/not_found/protected/error per platform) · `GET /v1/osint/reverse-image?url=` (SauceNAO proxy, free, 100/day) · `POST /v1/osint/visual-search` (Bing Visual Search proxy, Azure free tier 3k/mo, accepts URL or file upload) |
| `backend/app/main.py` | Wired osint router at `/v1` |
| `backend/app/services/breach_checker.py` | HIBP as first-class provider: `check_hibp_with_status()` returns structured `{status, breach_count, paste_count, evidence}`. `to_evidence_row()` normalizes breach records. `ACTION_MAP` maps severity → remediation text. |
| `backend/app/models/scan.py` | Added `hibp_status: Mapped[str \| None]` column |
| `backend/app/schemas/scan.py` | Added `HibpStatus`, `HibpEvidenceRow`, `HibpProviderOut`, extended `ScanResultOut` |
| `backend/app/workers/tasks.py` | Unpacks `(breaches, hibp_status)` tuple from `run_breach_checks()` |
| `backend/app/api/v1/scans.py` | Builds and returns `hibp_provider` block in scan result |
| `backend/app/services/report_service.py` | PDF/CSV exports include HIBP evidence rows |
| `backend/app/core/config.py` | Added `AZURE_BING_KEY: str = ''` and `AZURE_CV_KEY / AZURE_CV_ENDPOINT` (the latter not yet added — see Next Tasks) |
| `backend/alembic/versions/0003_add_hibp_status.py` | Migration: adds `hibp_status` column |
| `backend/tests/test_hibp.py` | 15 tests for HIBP service (no pytest-asyncio needed, uses `asyncio.get_event_loop().run_until_complete()`) |

### Frontend
| File | Status |
|------|--------|
| `frontend/src/components/tabs/FindYourselfTab.tsx` | **DONE** — real in-app scanner: auto-detects email/phone/name, calls `/api/v1/scans`, polls status, shows breach cards + broker table + HIBP status banner |
| `frontend/src/components/tabs/OsintTab.tsx` | **DONE** — Username Search calls `/api/v1/osint/username/{u}`, shows found/not_found/protected/error grid · Email Breach calls scan API, shows inline breach cards with HIBP evidence · IP + Domain lookup still work (call public APIs directly from frontend) · Phone still external links (no free API) |
| `frontend/src/components/tabs/ScanTab.tsx` | HIBP status pill + per-breach action labels + source URL links |
| `frontend/src/components/tabs/ReverseImageTab.tsx` | **DONE** — "Search In-App" calls Bing Visual Search (primary, real people) + SauceNAO (secondary, fallback) · drag-and-drop file upload · URL mode · keeps external engine grid below |
| `frontend/src/types/index.ts` | Added `HibpStatus`, `HibpEvidenceRow`, `HibpProvider` interfaces |
| `frontend/src/pages/Home.tsx` | Glassmorphism landing page (animated orbs, 3D tilt cards, radar canvas) |

---

## Next Tasks (in priority order)

### 1. Azure Computer Vision — ImageSearchTab in-app analysis
**User explicitly wants this.** They sent: https://learn.microsoft.com/en-us/rest/api/computervision/analyze-image/analyze-image?view=rest-computervision-v3.2

**What to build:**
- Add to `backend/app/core/config.py`:
  ```python
  AZURE_CV_KEY: str = ''
  AZURE_CV_ENDPOINT: str = ''  # e.g. https://your-resource.cognitiveservices.azure.com
  ```
- Add `POST /v1/osint/analyze-image` endpoint in `osint.py`:
  - Accepts image URL or file upload
  - Calls Azure Computer Vision v3.2 `analyze` with `visualFeatures=Faces,Tags,Description,Objects` and `details=Celebrities`
  - Returns: faces detected (count, attributes), celebrity names if identified, tags, description caption
- Update `frontend/src/components/tabs/ImageSearchTab.tsx`:
  - Add "Analyze In-App" button (URL + file upload, same pattern as ReverseImageTab)
  - Show: celebrity name if found, face count, top tags, scene description
  - Keep existing external link grid (PimEyes, FaceCheck, etc.) below results

**Azure CV API call:**
```python
# URL-based
POST {endpoint}/vision/v3.2/analyze?visualFeatures=Faces,Tags,Description,Objects&details=Celebrities
Headers: Ocp-Apim-Subscription-Key: {key}, Content-Type: application/json
Body: {"url": "https://..."}

# File upload
Headers: Ocp-Apim-Subscription-Key: {key}, Content-Type: application/octet-stream
Body: <raw bytes>
```

**Response fields to surface:**
- `description.captions[0].text` — scene description
- `faces[].faceRectangle` — face count
- `categories[].detail.celebrities[].name` — celebrity names
- `tags[].name` — top 10 tags
- `objects[].object` — detected objects

### 2. TrackHimTab — make in-app
Read `frontend/src/components/tabs/TrackHimTab.tsx` first. Currently likely an external link launcher. Goal: wire to existing scan API (POST /api/v1/scans with full_name or email) and show breach/broker results inline. Same pattern as FindYourselfTab.

### 3. FingerprintTab — review
Read `frontend/src/components/tabs/FingerprintTab.tsx`. If it currently uses browser fingerprinting APIs in-app already, it may be fine. If it links out, bring results in-app.

---

## Patterns to Follow

### Frontend in-app scan (email/name/phone)
```tsx
// 1. POST /api/v1/scans with {email} or {full_name} or {phone}
// 2. Poll GET /api/v1/scans/{id}/status until status === 'completed'|'failed'
// 3. GET /api/v1/scans/{id} for full result
// See FindYourselfTab.tsx for the complete pattern
```

### Frontend platform probe
```tsx
// GET /api/v1/osint/username/{username}
// Returns [{name, category, url, status: 'found'|'not_found'|'protected'|'error'}]
// See OsintTab.tsx username section for rendering pattern
```

### Frontend image search
```tsx
// Bing: POST /api/v1/osint/visual-search (FormData with file or image_url)
// SauceNAO: GET /api/v1/osint/reverse-image?url=
// See ReverseImageTab.tsx for full URL+upload+results pattern
```

### Auth headers
```tsx
const token = useAuthStore(s => s.token)
function headers() {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token && token !== 'demo-token-vindica') h['Authorization'] = `Bearer ${token}`
  return h
}
// For FormData: omit Content-Type, browser sets multipart boundary automatically
```

### Backend new endpoint skeleton
```python
# In backend/app/api/v1/osint.py, append to existing router
@router.post('/your-endpoint')
async def your_endpoint(...):
    settings = get_settings()
    key = settings.YOUR_KEY
    if not key:
        raise HTTPException(status_code=503, detail='API key not configured. Add YOUR_KEY to .env')
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(...)
    if r.status_code == 401: raise HTTPException(status_code=401, detail='Invalid API key')
    if r.status_code == 429: raise HTTPException(status_code=429, detail='Rate limit reached')
    return r.json()
```

---

## Environment & Secrets

- **Never commit `.env`**
- `AZURE_BING_KEY` — add to server `.env` after creating Bing Search v7 resource in Azure portal
- `AZURE_CV_KEY` + `AZURE_CV_ENDPOINT` — add to server `.env` after creating Computer Vision resource
- `HIBP_API_KEY` — already in server `.env`
- `POSTGRES_PASSWORD: vindica_db_pass_2026` — server `.env` only

---

## Dev Workflow

```bash
# Build check (must pass before commit)
cd /home/user/theclipart/frontend && npm run build

# Commit + push
git add <files>
git commit -m "feat: ..."
git push -u origin claude/push-codex-dataguard-fSWNC
```

**Always verify `npm run build` passes (TypeScript strict mode). No `tsc` errors allowed.**
