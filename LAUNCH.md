# DataGuard — Launch Checklist

## Local Dev (no Docker)

```bash
# Terminal 1 — backend demo
cd backend
DEMO_MODE=true python -m uvicorn demo_main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2 — frontend
cd frontend
npm run dev
# Open http://localhost:3000
```

The demo backend uses in-memory storage and returns realistic mock data.
No Postgres, Redis, Celery, or AWS required.

---

## Docker Dev (full stack, HTTP only)

```bash
cp backend/.env.example backend/.env
# Fill in at minimum: SECRET_KEY, POSTGRES_PASSWORD, REDIS_PASSWORD, FLOWER_PASSWORD

docker compose --env-file backend/.env --profile dev up -d
# Open http://localhost
```

---

## Production Deployment (HTTPS + SSL)

### 1 — Server setup
- Ubuntu 22.04 LTS minimum, 2 vCPU / 4 GB RAM recommended
- Install Docker + Docker Compose v2
- Open ports 80 and 443

### 2 — SSL certificate
```bash
mkdir -p nginx/ssl

# Option A: Let's Encrypt via certbot
certbot certonly --standalone -d yourdomain.com
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem  nginx/ssl/key.pem

# Option B: self-signed (dev/staging only)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem \
  -subj "/CN=yourdomain.com"
```

### 3 — Environment variables
```bash
cp backend/.env.example backend/.env
```

Fill in every `REPLACE_ME` value:

| Variable | How to get it |
|---|---|
| `SECRET_KEY` | `python backend/scripts/generate_key.py` |
| `POSTGRES_PASSWORD` | Strong random string |
| `REDIS_PASSWORD` | Strong random string |
| `FLOWER_PASSWORD` | Strong random string |
| `GITHUB_CLIENT_ID` | GitHub → Settings → Developer settings → OAuth Apps |
| `GITHUB_CLIENT_SECRET` | Same OAuth App |
| `GITHUB_REDIRECT_URI` | `https://yourdomain.com/api/v1/auth/github/callback` |
| `FRONTEND_URL` | `https://yourdomain.com` |
| `HIBP_API_KEY` | https://haveibeenpwned.com/API/Key |
| `CORS_ORIGINS` | `https://yourdomain.com` |
| `SES_FROM_EMAIL` | Verified SES sender address |
| `KMS_KEY_ID` | AWS KMS key ARN (required in production) |
| `DD_API_KEY` | Datadog → Organization Settings → API Keys |

### 4 — Update nginx server_name
Edit `nginx/nginx.conf` and replace `server_name _;` with your real domain:
```nginx
server_name yourdomain.com www.yourdomain.com;
```

### 5 — Deploy
```bash
docker compose --env-file backend/.env --profile production up -d --build
```

### 6 — Verify
```bash
curl https://yourdomain.com/health          # → {"status":"ok"}
curl https://yourdomain.com/api/v1/health   # → FastAPI health
docker compose ps                           # all services healthy
```

---

## Pre-Launch Checklist

### Secrets
- [ ] `SECRET_KEY` is 64+ chars and not the placeholder
- [ ] No real values in `.env.example`, `frontend/.env.example`, or any committed file
- [ ] `backend/.env` is in `.gitignore`
- [ ] Supabase service role key is not committed to git
- [ ] GitHub OAuth secret is not committed to git

### Database
- [ ] Supabase schema (`supabase/schema.sql`) has been run in SQL Editor
- [ ] `users` and `scans` tables exist and have RLS enabled
- [ ] Production `DATABASE_URL` points to your actual Postgres instance

### Auth
- [ ] GitHub OAuth App created with correct callback URL
- [ ] `GITHUB_REDIRECT_URI` matches the OAuth App exactly
- [ ] `FRONTEND_URL` set to production domain (no trailing slash)

### Backend
- [ ] `APP_ENV=production` in production `.env`
- [ ] `CORS_ORIGINS` set to production domain only
- [ ] `HIBP_API_KEY` set (breach scanning requires paid key)
- [ ] `KMS_KEY_ID` set (required in production mode)

### Opt-Out Automation
- [ ] `ALLOW_REAL_OPT_OUTS=false` until SES domain is verified
- [ ] SES domain verified and out of sandbox before enabling
- [ ] Test removal email delivery to a real inbox before enabling

### HTTPS / Nginx
- [ ] SSL cert exists at `nginx/ssl/cert.pem` and `nginx/ssl/key.pem`
- [ ] `server_name` in `nginx/nginx.conf` matches your domain
- [ ] Port 443 open in firewall / security group
- [ ] HTTP → HTTPS redirect working (`curl -I http://yourdomain.com` returns 301)

### Datadog (optional but recommended)
- [ ] `DD_API_KEY` set to a real Datadog key
- [ ] Datadog site set to `us3.datadoghq.com` (or your region)
- [ ] Datadog RUM application created, `VITE_DD_APPLICATION_ID` + `VITE_DD_CLIENT_TOKEN` set
- [ ] Frontend rebuilt after setting RUM vars (`docker compose build frontend`)

### DNS
- [ ] A record for `yourdomain.com` → server IP
- [ ] (Optional) CNAME `www` → `yourdomain.com`

---

## Useful Commands

```bash
# View logs
docker compose logs -f backend
docker compose logs -f nginx

# Restart single service after config change
docker compose restart backend

# Rebuild and redeploy backend only
docker compose --profile production up -d --build backend

# Run DB migrations manually
docker compose exec backend alembic upgrade head

# Tail all logs
docker compose logs -f --tail=100

# Check nginx config syntax before deploying
docker run --rm -v $(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro nginx:1.25-alpine nginx -t
```

---

## Feature Status

| Feature | Status | Notes |
|---|---|---|
| Landing page | ✅ | Red/black design, animated network graph |
| GitHub OAuth login | ✅ | Requires `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` |
| Exposure scan | ✅ | HIBP breach check + mock broker data (demo), real Playwright workers (production) |
| Data Map | ✅ | 6-category animated network visualization |
| Find Yourself | ✅ | 20+ pre-filled lookup links across HIBP, brokers, username search, dark web |
| Reverse Image Search | ✅ | PimEyes, Google Lens, TinEye, Yandex, FaceCheck, StopNCII, NCMEC |
| Opt-Out Queue | ✅ | 12-broker tracker with status management, CCPA/GDPR email templates |
| Legal Reports | ✅ | CCPA/CPRA, FTC §5, GDPR, cyberstalking, NCII signal builder + copy-out report |
| Evidence Tracker | ✅ | Account/URL/timeline/report logging, case file export, no private-location tracking |
| Datadog APM | ✅ | ddtrace on all Python services |
| Datadog RUM | ✅ | Browser monitoring + Core Web Vitals (requires RUM app setup) |
| Automated opt-outs | ⚠️ | Requires `ALLOW_REAL_OPT_OUTS=true` + verified SES domain |
| Playwright broker scan | ⚠️ | Requires Celery workers + Docker profile with shm_size |
