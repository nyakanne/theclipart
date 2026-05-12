# Production Deployment

This app is now wired for a real hosted deployment, but it needs live services and secrets before it can safely send real opt-out requests or store real users.

## Required Services

- GitHub repository: source control and deployment trigger.
- Supabase project: Postgres database and email magic-link authentication.
- Redis: Celery broker for scans, opt-outs, reports, and honey-token jobs.
- Backend host: Docker-capable service such as Render, Railway, Fly.io, ECS, or a VPS.
- Frontend host: static hosting such as Vercel, Netlify, Render Static Site, Cloudflare Pages, or the included Nginx container.
- Email delivery: AWS SES verified sender/domain for real broker opt-out emails.
- Optional APIs: Have I Been Pwned API key, Mailgun for honey-token inbound monitoring, AWS KMS for envelope encryption.

## Secret Rules

Never commit these values:

- `SECRET_KEY`
- `SUPABASE_JWT_SECRET`
- `DATABASE_URL`
- `SYNC_DATABASE_URL`
- `REDIS_URL`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `KMS_KEY_ID`
- `HIBP_API_KEY`
- `MAILGUN_API_KEY`
- `VITE_SUPABASE_ANON_KEY`

Store backend secrets in the backend host's encrypted environment settings. Store frontend public Supabase values in the frontend host environment.

## Backend Environment

Set these for production:

```bash
APP_ENV=production
DEMO_MODE=false
SECRET_KEY=<64+ random chars>
CORS_ORIGINS=https://your-domain.com
PUBLIC_APP_URL=https://your-domain.com

DATABASE_URL=postgresql+asyncpg://...
SYNC_DATABASE_URL=postgresql://...
REDIS_URL=redis://...

REQUIRE_AUTH=true
SUPABASE_JWT_SECRET=<Supabase JWT secret>

AWS_REGION=us-east-1
SES_FROM_EMAIL=noreply@your-domain.com
ALLOW_REAL_OPT_OUTS=true

HIBP_API_KEY=<optional>
MAILGUN_API_KEY=<optional>
HONEY_DOMAIN=honey.your-domain.com
KMS_KEY_ID=<optional AWS KMS key arn>
```

`ALLOW_REAL_OPT_OUTS=true` should only be enabled after SES is verified. When enabled, the backend requires an explicit `confirmed: true` payload before transmitting user identifiers to broker privacy contacts.

## Frontend Environment

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=<Supabase anon key>
```

The frontend uses Supabase magic-link sign-in. The API client automatically attaches the Supabase bearer token to scan, report, and opt-out requests.

## Supabase Setup

1. Create a Supabase project.
2. Copy the Postgres connection string into `DATABASE_URL` and `SYNC_DATABASE_URL`.
3. Copy the Supabase project URL and anon key into the frontend environment.
4. Copy the Supabase JWT secret into `SUPABASE_JWT_SECRET`.
5. In Supabase Auth, add the hosted domain to allowed redirect URLs.
6. Run migrations against Supabase Postgres:

```bash
cd backend
SYNC_DATABASE_URL='postgresql://...' alembic upgrade head
```

## Backend Start Commands

API:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Scan / opt-out / report worker:

```bash
celery -A app.workers.celery_app worker -Q scans,dsar,reports -c 2 -l info
```

Honey-token worker:

```bash
celery -A app.workers.celery_app worker -Q honey -c 1 -l info
```

Scheduler:

```bash
celery -A app.workers.celery_app beat -l info
```

## Frontend Build

```bash
cd frontend
npm install
npm run build
```

Host `frontend/dist` on your static host.

## HTTPS Docker Deployment

The included production Nginx container terminates HTTPS on ports `80` and `443`, redirects HTTP to HTTPS, and forwards `/api` to the FastAPI backend on the private Docker network.

Before starting production, place real certificate files here:

```text
nginx/ssl/cert.pem
nginx/ssl/key.pem
```

Do not commit the certificate or private key. You can use Let's Encrypt, Cloudflare Origin Certificates, or certificate files provided by your host. The tracked `nginx/ssl/README.md` keeps the mount path present without storing secrets.

Example production `.env` values:

```bash
APP_ENV=production
DEMO_MODE=false
SECRET_KEY=<64+ random chars>
CORS_ORIGINS=https://vindica.me,https://www.vindica.me
PUBLIC_APP_URL=https://vindica.me
SES_FROM_EMAIL=noreply@vindica.me
HONEY_DOMAIN=honey.vindica.me
```

Then run:

```bash
docker compose --profile production up -d --build
```

Verify:

```bash
curl -I https://vindica.me
curl https://vindica.me/api/health
```

If you deploy behind a managed host such as Render, Railway, Fly.io, Vercel, Netlify, or Cloudflare, let that host terminate HTTPS and set `PUBLIC_APP_URL` plus `CORS_ORIGINS` to the managed HTTPS URL.

## One-Stop Opt-Out Reality Check

What is real now:

- Broker listings are stored in Postgres.
- User identifiers are encrypted before storage.
- Broker opt-out actions create persistent DSAR/removal request records.
- The backend queues Celery jobs and sends removal emails through SES when configured.
- The frontend shows an explicit runtime confirmation before transmitting user identifiers.
- Scan access is scoped to the Supabase authenticated user when `REQUIRE_AUTH=true`.

What still depends on live services:

- SES must be verified before emails can send.
- Broker web-form submissions often require CAPTCHA or manual verification; the app can queue email-based removal requests and provide portal links, but it should not bypass site protections.
- HIBP checks require a HIBP API key.
- Honey-token inbound monitoring requires Mailgun or an SES inbound pipeline.
- Public hosting requires GitHub push access and deployment-provider credentials.

## Final Launch Checklist

- [ ] Push branch to GitHub.
- [ ] Configure HTTPS certificate or managed HTTPS host.
- [ ] Create Supabase project and set database/auth env vars.
- [ ] Run Alembic migrations.
- [ ] Create Redis instance.
- [ ] Deploy backend API.
- [ ] Deploy Celery workers.
- [ ] Verify SES sender/domain.
- [ ] Set `ALLOW_REAL_OPT_OUTS=true`.
- [ ] Deploy frontend with Supabase env vars.
- [ ] Set `CORS_ORIGINS` and `PUBLIC_APP_URL` to the live domain.
- [ ] Run a live test scan using your own data.
- [ ] Send one test opt-out to a broker you control or are authorized to contact.
