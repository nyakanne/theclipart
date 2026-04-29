# DataGuard / The Clipart

DataGuard is a full-stack privacy command center for finding personal-data exposure, staging broker removals, documenting compliance issues, preparing authority reports, and supporting image-abuse safety workflows.

The current app combines:

- A React/Vite frontend with a dark red/black Data Guard visual system inspired by the supplied mockups.
- A FastAPI backend with demo-mode scan results, broker listings, breach records, compliance findings, and report endpoints.
- An animated "second brain" exposure graph that turns a scan into linked broker, breach, people-search, social-profile, public-record, and ad-network signals.
- A one-stop opt-out workspace for data brokers, with copyable deletion requests and official portal links.
- A "Find Yourself" lookup desk for Have I Been Pwned, Firefox Monitor, DeHashed, people-search sites, username searches, and open-web exposure checks.
- A reverse-image-search desk with PimEyes, Google Lens, TinEye, Yandex Images, FaceCheck.ID, StopNCII, and local image hashing.
- A StopNCII / Take It Down inspired local hash receipt workflow that does not upload raw files from this app.
- A compliance and authority report center for CCPA/CPRA, California Delete Act, FTC Act Section 5, cyberstalking, NCII/NDII signals, IC3, state AG, CCRI, and platform reporting.

See [PROJECT_HISTORY.md](./PROJECT_HISTORY.md) for the step-by-step build record.
See [DEPLOYMENT.md](./DEPLOYMENT.md) for Supabase, secret storage, production auth, and real opt-out hosting steps.

## Run Locally

The easiest local path is demo mode, which uses an in-memory API and does not require Postgres, Redis, Celery, or Docker.

```bash
cd backend
python3.12 -m venv .venv312
.venv312/bin/python -m pip install fastapi 'uvicorn[standard]' pydantic-settings prometheus-fastapi-instrumentator structlog python-multipart email-validator
DEMO_MODE=true .venv312/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open <http://127.0.0.1:3000>.

Useful routes:

- `/` - interactive landing page and privacy command center.
- `/lookup` - Find Yourself exposure lookup workflow.
- `/image-search` - reverse-image-search and local hash workflow.
- `/opt-out` - broker removal queue.
- `/reports` - compliance and authority report builder.
- `/scan/:scanId` - scan-result dashboard with lookup, breach, broker, image, sentinel, compliance, and regulator tabs.

## Production-Style Stack

The repository also includes Dockerfiles and `docker-compose.yml` for the full stack with Postgres, Redis, Celery workers, and the production frontend container. The production path expects Docker to be running.

For a live internet deployment, run the app with `DEMO_MODE=false`, Supabase Auth, Postgres, Redis, and verified email delivery. Real one-stop opt-out delivery is intentionally gated behind `ALLOW_REAL_OPT_OUTS=true` plus an in-app user confirmation because it transmits personal identifiers to broker privacy contacts.

## GitHub Publishing

This folder is already a Git repository with `origin` set to `https://github.com/nyakanne/theclipart.git`.

Before publishing from Codex, confirm the repo target and visibility. Pushing uploads the code to GitHub.
