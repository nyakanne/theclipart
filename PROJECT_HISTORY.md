# DataGuard Build History

This file is the durable project memory for the work done in this thread. It records what was built, why, and how to run it again.

## 1. Starting Point

- The project started from `https://github.com/nyakanne/theclipart.git`.
- The app had a FastAPI backend and a React frontend, but it was not running cleanly for local preview.
- The browser was pointed at local ports and showed blank or incomplete screens.

## 2. Local Runtime Fixes

- Installed and normalized frontend dependencies.
- Added a Vite wrapper script so `npm run dev`, `npm run build`, and `npm run preview` run reliably.
- Added a frontend package lock.
- Built the frontend into `frontend/dist`.
- Started a local frontend server at `http://127.0.0.1:3000/`.
- Started a FastAPI backend in demo mode at `http://127.0.0.1:8000/`.
- Updated the backend root route so visiting port 8000 redirects to the real frontend on port 3000.

## 3. Backend Demo Mode

- Added an in-memory demo scan API so the product works without Postgres, Redis, Celery, or live broker scraping.
- Demo scans now return:
  - Broker listings and opt-out URLs.
  - Breach and paste exposure records.
  - Honey-token / sentinel hits.
  - Compliance score, violations, and recommendations.
  - Report package metadata.
- Demo endpoints support scan creation, scan status, scan result fetches, opt-out actions, DSAR-style actions, and report generation.

## 4. Mockup-Inspired Visual Rebuild

- Rebuilt the landing page around the supplied Data Guard / DataShadow mockups.
- Added the black, red, glass, and high-contrast privacy-dashboard theme.
- Added the animated exposure graph:
  - Red and white pixel field.
  - Dissolving face-like silhouette.
  - Linked second-brain data nodes.
  - Central privacy/fingerprint core.
  - Broker, public-record, social-profile, breach, ad-network, and people-search cards.
- Added an interactive hero intro:
  - Signal web forms first.
  - The signal bursts into "TAKE BACK YOUR DATA".
  - The page settles into the main privacy command center.
  - A "Replay signal" control replays the intro.

## 5. Product Sections

- Added the main dashboard section with privacy score, source count, compliance score, and exposure summary.
- Added the broker removal queue:
  - 20 prioritized broker portals.
  - Copyable removal request templates.
  - Completion tracking stored in local browser storage.
  - Official opt-out portal links.
- Added the authority report center:
  - Incident intake fields.
  - Generated report packet preview.
  - Copyable report packet.
  - Platform and authority reporting links.
- Added advocate and support resources:
  - CCRI Image Abuse Helpline.
  - Cyber Civil Rights Safety Center.
  - StopNCII.org.
  - NCMEC Take It Down.
  - Trusted-contact and advocate-call scripts.

## 6. StopNCII / Take It Down Integration

- Integrated the StopNCII-style concept as a local hash workflow.
- The app can create a SHA-256 receipt for an image or video in the browser.
- The raw file is not uploaded by this app.
- The receipt can be copied into reports or case notes.
- The support section links to StopNCII and NCMEC Take It Down for the user-controlled official flow.

## 7. Compliance Evaluation

- Restored the compliance score and report-evaluation behavior from earlier versions.
- Added legal signal panels for:
  - CCPA / CPRA.
  - California Delete Act.
  - FTC Act Section 5.
  - 18 U.S.C. 2261A cyberstalking.
  - NCII / NDII state-law signals.
  - Platform safety policies.
- Added regulator/report destinations:
  - FBI IC3.
  - NAAG state attorney general directory.
  - FTC ReportFraud.
  - CCRI.
  - StopNCII.
  - NCMEC Take It Down.

## 8. Missing "Find Yourself" and Reverse Image Search Workflows

- Added a dedicated "Find Yourself" tab and route at `/lookup`.
- Added the same lookup tab to scan results.
- The lookup workflow stages checks for:
  - Have I Been Pwned.
  - Firefox Monitor.
  - DeHashed.
  - Google exact-match search.
  - FastPeopleSearch.
  - Spokeo.
  - Whitepages.
  - PeekYou.
- The app avoids auto-submitting private lookup terms to third-party sites. It lets the user copy the term and open official sites manually.
- Added a reverse-image-search tab and route at `/image-search`.
- Added the same image tab to scan results.
- The reverse image workspace includes:
  - PimEyes.
  - Google Lens.
  - TinEye.
  - Yandex Images.
  - FaceCheck.ID.
  - StopNCII.
- The image workflow stages files locally, creates a SHA-256 receipt, shows a local preview, and provides a copyable search packet.

## 9. Current Local Commands

Backend:

```bash
cd backend
DEMO_MODE=true .venv312/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run build
npm run preview
```

Open:

```text
http://127.0.0.1:3000/
```

## 10. Current Verification

- `npm run build` passes.
- The app loads in the in-app browser at `http://127.0.0.1:3000/`.
- The signal intro and replay interaction render.
- The new lookup and reverse-image-search routes are part of the React app and ready for browser verification after restart.

## 11. Publishing Notes

- The local Git remote is `https://github.com/nyakanne/theclipart.git`.
- Publishing to GitHub uploads this code externally.
- Confirm repo target and visibility before pushing.

## 12. Production Lock-In Pass

- Added a production deployment guide in `DEPLOYMENT.md`.
- Added frontend and backend env templates for Supabase, real opt-out delivery, and safe secret handling.
- Added Supabase JWT ownership checks in the backend.
- Added a Supabase magic-link account page in the frontend.
- Added API bearer-token forwarding from the frontend to the backend.
- Added `user_id` ownership on scans and an Alembic migration for existing databases.
- Hardened PII encryption so non-KMS deployments use a Fernet key derived from `SECRET_KEY` instead of storing the encryption key beside the ciphertext.
- Made real opt-out endpoints require `confirmed: true` before transmitting identifiers to broker contacts.
- Fixed the real opt-out path so single and one-stop opt-outs create persistent DSAR/removal request rows before queueing Celery delivery jobs.
- Added runtime safety checks so production cannot run with demo mode or default secrets.
