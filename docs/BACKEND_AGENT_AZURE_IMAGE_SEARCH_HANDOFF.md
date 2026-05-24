# Backend Agent Handoff: Azure Image Search / Analysis

Last updated: 2026-05-19

This handoff is for a backend-focused agent helping Vindica finish the in-app image-analysis path.

## Current Honest State

The Azure-backed image-analysis task is **not finished** in this workspace.

What exists right now:

- [frontend/src/components/Investigation/ReverseImageSearchPanel.tsx](/Users/anneshirleynyako/Documents/Codex/2026-04-27/https-github-com-nyakanne-theclipart-git/frontend/src/components/Investigation/ReverseImageSearchPanel.tsx)
  - local SHA-256 hashing
  - local image receipt saving
  - manual result URL capture
  - external portal launchers for PimEyes / Google Lens / TinEye / Yandex / FaceCheck / StopNCII
- No Azure Computer Vision backend route
- No frontend API client method for image analysis
- No typed request/response model for in-app image analysis

That means the current image experience is still partly external-tool driven. It is not yet “everything in-app.”

## Goal

Add a **backend-owned in-app image analysis path** so Vindica can accept an uploaded image or image URL, call Azure Computer Vision safely from the backend, and return explicit results to the browser.

This should support:

- staged image upload from the browser
- backend API call to Azure
- browser-visible structured results
- vault/report compatibility later

## Scope For This Agent

Backend only. Do **not** redesign frontend flows beyond what is strictly required for contract compatibility.

The agent should:

1. add Azure Computer Vision config
2. add backend image-analysis service
3. add backend route(s) under `/api/v1/lookups` or a similar backend-owned namespace
4. return typed structured output
5. keep secrets backend-only
6. add tests for missing config / success / provider failure

## Recommended Files To Touch

- [backend/app/core/config.py](/Users/anneshirleynyako/Documents/Codex/2026-04-27/https-github-com-nyakanne-theclipart-git/backend/app/core/config.py)
- [backend/app/api/v1/lookups.py](/Users/anneshirleynyako/Documents/Codex/2026-04-27/https-github-com-nyakanne-theclipart-git/backend/app/api/v1/lookups.py)
- [backend/app/schemas/scan.py](/Users/anneshirleynyako/Documents/Codex/2026-04-27/https-github-com-nyakanne-theclipart-git/backend/app/schemas/scan.py) or a new dedicated schema module if cleaner
- new service file:
  - `backend/app/services/azure_image_service.py`
- optional tests:
  - `backend/tests/test_azure_image_service.py`
  - `backend/tests/test_lookups_image.py`

If the repo has no established backend test directory yet, the agent should create the smallest coherent one instead of inventing fake tests.

## Environment Variables To Add

These must remain backend-only:

- `AZURE_COMPUTER_VISION_ENDPOINT`
- `AZURE_COMPUTER_VISION_KEY`
- optional:
  - `AZURE_COMPUTER_VISION_TIMEOUT_SECONDS`
  - `AZURE_COMPUTER_VISION_API_VERSION`

Do **not** add any `VITE_*` equivalent for these.

## Suggested API Shape

Keep it simple and typed.

### Option A: URL analysis

`POST /api/v1/lookups/image/url`

Request:

```json
{
  "image_url": "https://example.com/image.jpg"
}
```

### Option B: file upload

`POST /api/v1/lookups/image/upload`

Multipart form-data:

- `file`

If implementing only one path first, prioritize **file upload** because the current local UI already stages a file.

## Suggested Response Shape

The response should be explicit and browser-friendly, not raw Azure JSON.

Example:

```json
{
  "provider": "azure_computer_vision",
  "status": "completed",
  "summary": "Image analysis completed.",
  "caption": "A person standing outdoors near a car",
  "confidence": 0.87,
  "tags": [
    { "name": "person", "confidence": 0.99 },
    { "name": "vehicle", "confidence": 0.91 }
  ],
  "categories": [
    { "name": "people_", "score": 0.94 }
  ],
  "objects": [
    {
      "name": "car",
      "confidence": 0.93,
      "box": { "x": 120, "y": 80, "w": 420, "h": 210 }
    }
  ],
  "provider_url": null
}
```

If the provider has no usable result:

```json
{
  "provider": "azure_computer_vision",
  "status": "no_match",
  "summary": "Azure did not return a usable image analysis result."
}
```

If unconfigured:

```json
{
  "provider": "azure_computer_vision",
  "status": "unavailable",
  "summary": "Azure Computer Vision is not configured for this runtime."
}
```

## Implementation Notes

- Follow the existing pattern used by:
  - [backend/app/services/ipinfo_service.py](/Users/anneshirleynyako/Documents/Codex/2026-04-27/https-github-com-nyakanne-theclipart-git/backend/app/services/ipinfo_service.py)
  - [backend/app/services/search_evidence_service.py](/Users/anneshirleynyako/Documents/Codex/2026-04-27/https-github-com-nyakanne-theclipart-git/backend/app/services/search_evidence_service.py)
  - [backend/app/api/v1/lookups.py](/Users/anneshirleynyako/Documents/Codex/2026-04-27/https-github-com-nyakanne-theclipart-git/backend/app/api/v1/lookups.py)

- Keep the backend response normalized. Do not dump the provider response directly to the browser.

- The agent should prefer `httpx.AsyncClient` and return small, stable shapes.

- File uploads should enforce:
  - image MIME type only
  - conservative size limit
  - clear error on unsupported input

## Acceptance Criteria

This task is done when all of the following are true:

1. backend starts cleanly with or without Azure env vars
2. when Azure is unconfigured, the route returns a clear `unavailable` response
3. when Azure is configured and returns data, the browser receives structured analysis fields
4. provider failures are returned as `failed` without crashing the API
5. no Azure secret reaches the frontend bundle
6. `npm run build` still passes
7. backend verification passes for the new route(s)

## Non-Goals

This agent should **not**:

- redesign the entire image UI
- add fake image results
- push Azure keys into the frontend
- build facial recognition or identity matching flows
- add anything that crosses the product’s safety boundary into stalking, tracking, or deanonymization

## Good Follow-On Work After This

Once Azure image analysis is real, the next agent can:

1. wire the frontend receipt panel to call the new route
2. store returned analysis as an evidence item or saved artifact
3. include image-analysis output in reports and vault history

## Copy-Paste Prompt For Another Agent

```text
Read docs/BACKEND_AGENT_AZURE_IMAGE_SEARCH_HANDOFF.md first.

Your job is backend-only:
- add Azure Computer Vision config
- add a backend image-analysis service
- add typed image-analysis route(s)
- return normalized browser-friendly data
- keep secrets backend-only
- add real tests for unconfigured/success/failure cases

Do not touch unrelated frontend UI.
Do not add placeholder or fake image results.
Follow the backend patterns already used for IPinfo and Brave search.
```
