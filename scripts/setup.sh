#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# DataGuard — VPS first-time setup script
#
# Run this once on a fresh Ubuntu 22.04+ server AFTER cloning the repo.
# It checks prerequisites, creates required directories, and prepares .env.
#
# Usage:
#   chmod +x scripts/setup.sh
#   sudo ./scripts/setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'; NC='\033[0m'
info()  { echo -e "${GREEN}[setup]${NC} $*"; }
warn()  { echo -e "${YELLOW}[warn] ${NC} $*"; }
error() { echo -e "${RED}[error]${NC} $*"; exit 1; }

# ── Must run from repo root ───────────────────────────────────────────────────
[[ -f docker-compose.yml ]] || error "Run this script from the repo root."

# ── Prerequisites ─────────────────────────────────────────────────────────────
info "Checking prerequisites..."

if ! command -v docker &>/dev/null; then
  error "Docker is not installed. Install it from https://docs.docker.com/engine/install/ubuntu/"
fi

if ! docker compose version &>/dev/null; then
  error "Docker Compose v2 is not installed. Install it with: apt-get install docker-compose-plugin"
fi

if ! command -v python3 &>/dev/null; then
  error "python3 is not installed."
fi

info "Docker $(docker --version | awk '{print $3}' | tr -d ',')"
info "Docker Compose $(docker compose version --short)"

# ── Prepare backend/.env ──────────────────────────────────────────────────────
if [[ -f backend/.env ]]; then
  warn "backend/.env already exists — skipping copy."
else
  cp backend/.env.example backend/.env
  info "Created backend/.env from .env.example"
fi

# ── Generate SECRET_KEY ───────────────────────────────────────────────────────
if grep -q 'REPLACE_ME_run_python' backend/.env; then
  info "Generating SECRET_KEY..."
  python3 backend/scripts/generate_key.py
else
  info "SECRET_KEY is already set — skipping generation."
fi

# ── SSL directory ─────────────────────────────────────────────────────────────
mkdir -p nginx/ssl
info "Created nginx/ssl/ directory."

# ── Check for SSL certs ───────────────────────────────────────────────────────
if [[ ! -f nginx/ssl/cert.pem || ! -f nginx/ssl/key.pem ]]; then
  warn "SSL certificates not found at nginx/ssl/cert.pem + nginx/ssl/key.pem"
  echo ""
  echo "  Option A — Let's Encrypt (recommended for production):"
  echo "    apt-get install certbot"
  echo "    certbot certonly --standalone -d yourdomain.com"
  echo "    cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem"
  echo "    cp /etc/letsencrypt/live/yourdomain.com/privkey.pem  nginx/ssl/key.pem"
  echo ""
  echo "  Option B — Self-signed (dev/staging only, NOT for production):"
  echo "    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\"
  echo "      -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem \\"
  echo "      -subj \"/CN=yourdomain.com\""
  echo ""
else
  info "SSL certs found at nginx/ssl/"
fi

# ── Remind about required env var replacements ────────────────────────────────
REMAINING=$(grep -c 'REPLACE_ME' backend/.env 2>/dev/null || true)
if [[ "$REMAINING" -gt 0 ]]; then
  warn "$REMAINING REPLACE_ME placeholder(s) remain in backend/.env — fill them in before starting."
  echo ""
  echo "  Required before first start:"
  echo "    POSTGRES_PASSWORD   — strong random string"
  echo "    REDIS_PASSWORD      — strong random string"
  echo "    FLOWER_PASSWORD     — strong random string"
  echo "    GITHUB_CLIENT_ID    — from github.com → Settings → Developer settings → OAuth Apps"
  echo "    GITHUB_CLIENT_SECRET"
  echo "    GITHUB_REDIRECT_URI — https://yourdomain.com/api/v1/auth/github/callback"
  echo "    FRONTEND_URL        — https://yourdomain.com"
  echo "    CORS_ORIGINS        — https://yourdomain.com"
  echo ""
  echo "  Required in production (APP_ENV=production):"
  echo "    KMS_KEY_ID          — AWS KMS key ARN"
  echo "    HIBP_API_KEY        — https://haveibeenpwned.com/API/Key"
  echo "    SES_FROM_EMAIL      — verified SES sender"
  echo ""
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
info "Setup complete. Next steps:"
echo ""
echo "  1. Fill in all REPLACE_ME values in backend/.env"
echo "  2. Edit nginx/nginx.conf — replace 'server_name _;' with your domain"
echo "  3. Place SSL certs at nginx/ssl/cert.pem and nginx/ssl/key.pem"
echo "  4. Start the stack:"
echo "     docker compose --env-file backend/.env --profile production up -d --build"
echo ""
echo "  See LAUNCH.md for the full deployment guide and pre-launch checklist."
echo ""
