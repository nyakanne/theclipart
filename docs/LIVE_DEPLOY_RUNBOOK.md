# Vindica Live Deploy Runbook

This is the safe path for updating `vindica.me` without repeating the broken half-deploy where `frontend/` and `backend/` disappeared from `/var/www/vindica`.

## 1. Local Verification

Run from the repo root:

```bash
cd frontend
npm run build
cd ..
backend/.venv312/bin/python -m compileall -q backend/app
```

## 2. Package The Current Commit

The deploy package uses `git archive`, so only committed files are included. Local `.env`, `node_modules`, `dist`, backup folders, and untracked scratch files are excluded.

```bash
scripts/package-live-deploy.sh
```

The script prints an archive path like:

```bash
/tmp/vindica-live-deploy-20260523-190000.tar.gz
```

## 3. Upload

```bash
scp /tmp/vindica-live-deploy-YYYYMMDD-HHMMSS.tar.gz root@5.78.72.84:/tmp/
```

## 4. Stage On Server Before Touching Live Folders

```bash
ssh root@5.78.72.84
cd /var/www/vindica

ARCHIVE=/tmp/vindica-live-deploy-YYYYMMDD-HHMMSS.tar.gz
STAGE=/tmp/vindica-stage-$(date +%Y%m%d-%H%M%S)

mkdir -p "$STAGE"
tar -xzf "$ARCHIVE" -C "$STAGE"

test -d "$STAGE/frontend"
test -d "$STAGE/backend"
test -f "$STAGE/docker-compose.yml"
```

Stop if any `test` command fails.

## 5. Backup And Swap

```bash
cd /var/www/vindica
STAMP=$(date +%Y%m%d-%H%M%S)

cp -a frontend "frontend.backup.$STAMP"
cp -a backend "backend.backup.$STAMP"
cp docker-compose.yml "docker-compose.yml.backup.$STAMP"

rsync -a --delete "$STAGE/frontend/" frontend/
rsync -a --delete "$STAGE/backend/" backend/
cp "$STAGE/docker-compose.yml" docker-compose.yml

cp .env backend/.env
```

## 6. Rebuild App Containers

```bash
docker compose --env-file .env build frontend backend worker-scans worker-honey beat
docker compose --env-file .env up -d frontend backend worker-scans worker-honey beat
docker compose --env-file .env ps
```

## 7. Smoke Test

From your local machine:

```bash
scripts/live-smoke-test.sh https://vindica.me
```

Or from the server:

```bash
curl -s https://vindica.me/health
curl -I https://vindica.me/osint
curl -I https://vindica.me/image-search
curl -i https://vindica.me/api/v1/lookups/username/github
```

## 8. Host Nginx Reminder

The host nginx config must preserve `/api`:

```nginx
location /api/ {
  proxy_pass http://127.0.0.1:8000;
}
```

Do not use a trailing slash on `proxy_pass` here, or `/api/v1/...` can become `/v1/...`.

