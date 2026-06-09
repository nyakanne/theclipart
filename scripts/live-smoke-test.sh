#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-https://vindica.me}"
BASE_URL="${BASE_URL%/}"

pass() {
  printf 'PASS %s\n' "$1"
}

fail() {
  printf 'FAIL %s\n' "$1" >&2
  exit 1
}

require_status() {
  local path="$1"
  local expected="${2:-200}"
  local code
  code="$(curl -sS -o /tmp/vindica-smoke-body.txt -w '%{http_code}' "$BASE_URL$path")"
  if [ "$code" != "$expected" ]; then
    echo "Response body for $path:" >&2
    sed -n '1,40p' /tmp/vindica-smoke-body.txt >&2
    fail "$path returned $code, expected $expected"
  fi
  pass "$path -> $code"
}

health_body="$(curl -sS "$BASE_URL/health")"
case "$health_body" in
  *'"status":"ok"'*) pass "/health -> ok" ;;
  *) echo "$health_body" >&2; fail "/health did not return status ok" ;;
esac

ready_body="$(curl -sS "$BASE_URL/ready")"
case "$ready_body" in
  *'"status":"ready"'*) pass "/ready -> ready" ;;
  *) echo "$ready_body" >&2; fail "/ready reported production blockers" ;;
esac

require_status "/"
require_status "/lookup"
require_status "/osint"
require_status "/image-search"

api_code="$(curl -sS -o /tmp/vindica-smoke-api.txt -w '%{http_code}' "$BASE_URL/api/v1/lookups/username/github")"
case "$api_code" in
  200|401|403)
    pass "/api/v1 prefix is routed -> $api_code"
    ;;
  *)
    echo "API response body:" >&2
    sed -n '1,40p' /tmp/vindica-smoke-api.txt >&2
    fail "/api/v1 prefix returned $api_code"
    ;;
esac

echo "Live smoke test complete for $BASE_URL"
