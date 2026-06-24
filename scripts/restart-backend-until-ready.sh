#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env}"
BASE_URL="${BASE_URL:-http://127.0.0.1:8000}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-12}"
SLEEP_SECONDS="${SLEEP_SECONDS:-10}"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-60}"
RUN_DOCTOR="${RUN_DOCTOR:-1}"

services=(backend worker-scans worker-honey beat)

usage() {
  cat <<'EOF'
Usage:
  scripts/restart-backend-until-ready.sh

Environment overrides:
  ENV_FILE=.env                         Compose env file.
  BASE_URL=http://127.0.0.1:8000         Backend URL to test.
  MAX_ATTEMPTS=12                        Retry attempts. Use 0 to retry forever.
  SLEEP_SECONDS=10                       Delay between attempts.
  HEALTH_TIMEOUT_SECONDS=60              Seconds to wait per restart.
  RUN_DOCTOR=1                           Run production-doctor before retry loop.

Example:
  MAX_ATTEMPTS=20 scripts/restart-backend-until-ready.sh
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "FAIL env file not found: $ENV_FILE" >&2
  exit 2
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "FAIL docker is not installed or not on PATH." >&2
  exit 2
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "FAIL docker compose is not available." >&2
  exit 2
fi

if [[ "$RUN_DOCTOR" == "1" ]]; then
  echo "== Preflight: production doctor =="
  python3 scripts/production-doctor.py --env-file "$ENV_FILE"
fi

tmp_body="$(mktemp)"
trap 'rm -f "$tmp_body"' EXIT

health_ok() {
  curl -fsS --max-time 5 "$BASE_URL/health" -o "$tmp_body" >/dev/null
}

ready_status() {
  curl -fsS --max-time 8 "$BASE_URL/ready" -o "$tmp_body" >/dev/null
  python3 - "$tmp_body" <<'PY'
import json
import sys
from pathlib import Path

try:
    payload = json.loads(Path(sys.argv[1]).read_text())
except Exception:
    print("invalid")
    raise SystemExit(0)

print(payload.get("status", "unknown"))
PY
}

print_ready_body() {
  python3 - "$tmp_body" <<'PY'
import json
import sys
from pathlib import Path

try:
    payload = json.loads(Path(sys.argv[1]).read_text())
except Exception:
    print(Path(sys.argv[1]).read_text()[:1200])
    raise SystemExit(0)

print(json.dumps({
    "status": payload.get("status"),
    "blockers": payload.get("blockers", []),
    "capabilities": payload.get("capabilities", {}),
}, indent=2, sort_keys=True))
PY
}

wait_for_ready() {
  local deadline=$((SECONDS + HEALTH_TIMEOUT_SECONDS))
  local status=""

  while (( SECONDS < deadline )); do
    if health_ok; then
      status="$(ready_status || true)"
      if [[ "$status" == "ready" ]]; then
        return 0
      fi
    fi
    sleep 2
  done

  return 1
}

attempt=1
while :; do
  echo "== Attempt $attempt: recreate backend stack =="
  docker compose --env-file "$ENV_FILE" up -d --force-recreate "${services[@]}"

  if wait_for_ready; then
    echo "PASS backend is healthy and ready."
    curl -fsS "$BASE_URL/ready"
    echo
    exit 0
  fi

  echo "WARN backend did not become ready within ${HEALTH_TIMEOUT_SECONDS}s."
  if curl -fsS --max-time 8 "$BASE_URL/ready" -o "$tmp_body" >/dev/null 2>&1; then
    print_ready_body
  else
    echo "Could not fetch $BASE_URL/ready. Recent backend logs:"
    docker compose --env-file "$ENV_FILE" logs backend --tail=80 || true
  fi

  if [[ "$MAX_ATTEMPTS" != "0" && "$attempt" -ge "$MAX_ATTEMPTS" ]]; then
    echo "FAIL backend did not become ready after $attempt attempt(s)." >&2
    echo "Inspect with:"
    echo "  docker compose --env-file $ENV_FILE ps"
    echo "  docker compose --env-file $ENV_FILE logs backend worker-scans --tail=160"
    exit 1
  fi

  attempt=$((attempt + 1))
  echo "Sleeping ${SLEEP_SECONDS}s before retry..."
  sleep "$SLEEP_SECONDS"
done
