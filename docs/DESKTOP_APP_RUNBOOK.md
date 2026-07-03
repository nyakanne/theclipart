# Vindica Desktop App Runbook

Vindica now ships as an installable Progressive Web App for desktop while keeping the existing Capacitor mobile projects.

## What This Adds

- Installable app manifest for Mac, Windows, Linux, iOS, and Android browser installs.
- App shell service worker with an offline fallback page.
- Desktop install button in the top navigation.
- Production build scripts for a downloadable static app bundle.

## Local Test

```bash
cd frontend
npm run build
npm run preview
```

Open the preview URL in Chrome or Edge. The browser should offer **Install Vindica** once served over `localhost` or HTTPS.

## Build A Downloadable Desktop Bundle

```bash
cd frontend
npm run desktop:package
```

The archive is written to:

```text
../dist-desktop/vindica-desktop-pwa.tar.gz
```

This bundle is the production PWA app shell. Host it behind HTTPS, then users can install it onto their computer from the browser.

## Production Requirements

- Serve the built `dist/` directory over HTTPS.
- Keep API requests proxied to `/api/v1` for web production.
- For mobile/native builds, set `VITE_API_BASE_URL=https://vindica.me/api/v1`.
- Do not cache `/api/` responses in the service worker. Live scan data must always come from the backend.

## Install Instructions For Users

- Chrome/Edge desktop: open Vindica, click **Install app** in the address bar or Vindica top nav.
- Safari macOS: File menu, **Add to Dock**.
- iPhone/iPad Safari: Share button, **Add to Home Screen**.
- Android Chrome: browser menu, **Install app**.
