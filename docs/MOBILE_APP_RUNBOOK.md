# Vindica Mobile App Runbook

Vindica can ship as a Capacitor mobile app that reuses the existing React frontend and FastAPI backend.

## Current Mobile Shell

- Native wrapper: Capacitor
- iOS bundle id: `me.vindica.app`
- Android application id: `me.vindica.app`
- Web build output: `frontend/dist`
- API base for mobile builds: `VITE_API_BASE_URL`

The web app can keep using relative API calls (`/api/v1`). Mobile builds must use a full HTTPS API URL because the app runs inside a native WebView, not on `vindica.me`.

## Local Setup

```bash
cd frontend
cp .env.mobile.example .env.mobile
```

Edit `.env.mobile`:

```bash
VITE_API_BASE_URL=https://vindica.me/api/v1
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-public-key
```

## Build And Sync

```bash
cd frontend
npm run mobile:sync
```

## Open Native Projects

iOS:

```bash
cd frontend
npm run mobile:ios
```

Android:

```bash
cd frontend
npm run mobile:android
```

## Backend Requirement

Real scans will not work in the mobile app until the production API is reachable:

```bash
curl -i https://vindica.me/health
curl -i https://vindica.me/ready
```

If those fail, repair the VPS, DNS, firewall, nginx, Docker, or backend stack before testing mobile scan flows.

## Store Readiness Checklist

- Privacy Policy and Terms are reachable in-app.
- Account/vault auth is configured with Supabase public env vars.
- Production API is HTTPS-only and returns `/ready` status `ready`.
- App icons and splash images are generated for iOS and Android.
- Sensitive scan history is account-scoped and not persisted in local storage.
- TestFlight and Play Internal Testing have at least one full scan smoke test before public release.
