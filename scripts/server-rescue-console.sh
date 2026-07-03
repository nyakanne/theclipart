#!/usr/bin/env bash
# Run this from the VPS provider web console when SSH or vindica.me is down.
# It avoids deleting data and prints enough state to see the next blocker.

set -u

APP_DIR="${APP_DIR:-/var/www/vindica}"
ENV_FILE="${ENV_FILE:-.env}"

section() {
  printf '\n== %s ==\n' "$1"
}

run() {
  printf '+ %s\n' "$*"
  "$@"
}

section "Host basics"
date -Is || true
hostname || true
ip addr show || true
df -h || true
free -h || true

section "SSH repair"
if command -v systemctl >/dev/null 2>&1; then
  run systemctl status ssh --no-pager || run systemctl status sshd --no-pager || true
  run systemctl restart ssh || run systemctl restart sshd || true
fi
if command -v ufw >/dev/null 2>&1; then
  run ufw allow OpenSSH || true
  run ufw allow 80/tcp || true
  run ufw allow 443/tcp || true
  run ufw status || true
fi
ss -tlnp | grep -E ':(22|80|443)\b' || true

section "App directory"
if [[ ! -d "$APP_DIR" ]]; then
  echo "FAIL app directory not found: $APP_DIR"
  exit 1
fi
cd "$APP_DIR" || exit 1
pwd
ls -lah | sed -n '1,80p'

section "Docker services"
if command -v docker >/dev/null 2>&1; then
  run systemctl restart docker || true
  docker ps || true
  if [[ -f docker-compose.yml && -f "$ENV_FILE" ]]; then
    run docker compose --env-file "$ENV_FILE" ps || true
    run docker compose --env-file "$ENV_FILE" up -d postgres redis || true
    if [[ -x scripts/restart-backend-until-ready.sh ]]; then
      export MAX_ATTEMPTS="${MAX_ATTEMPTS:-6}"
      run scripts/restart-backend-until-ready.sh || true
    else
      run docker compose --env-file "$ENV_FILE" up -d frontend backend worker-scans worker-honey beat || true
    fi
    run docker compose --env-file "$ENV_FILE" ps || true
    run docker compose --env-file "$ENV_FILE" logs backend --tail=120 || true
  fi
fi

section "Nginx"
if command -v nginx >/dev/null 2>&1; then
  run nginx -t || true
  run systemctl restart nginx || true
  run systemctl status nginx --no-pager || true
fi
ss -tlnp | grep -E ':(22|80|443)\b' || true

section "Local health checks"
curl -i --max-time 8 http://127.0.0.1:3000/ || true
curl -i --max-time 8 http://127.0.0.1:8000/health || true
curl -i --max-time 8 http://127.0.0.1:8000/ready || true
curl -i --max-time 8 http://127.0.0.1/ || true

section "Public health checks from VPS"
curl -i --max-time 12 https://vindica.me/health || true
curl -I --max-time 12 https://vindica.me/ || true

section "Done"
echo "If SSH still fails from your Mac, paste the SSH and ss/ufw sections back into Codex."
