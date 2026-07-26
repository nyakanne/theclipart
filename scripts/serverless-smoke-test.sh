#!/usr/bin/env bash
set -euo pipefail

FRONTEND_URL="${1:-https://vindica.me}"
API_URL="${2:-$FRONTEND_URL}"
FRONTEND_URL="${FRONTEND_URL%/}"
API_URL="${API_URL%/}"
ALLOW_BLOCKED_READY="${ALLOW_BLOCKED_READY:-0}"

tmp_body="$(mktemp)"
tmp_headers="$(mktemp)"
cleanup() {
  rm -f "$tmp_body" "$tmp_headers"
}
trap cleanup EXIT

pass() {
  printf 'PASS %s\n' "$1"
}

warn() {
  printf 'WARN %s\n' "$1" >&2
}

fail() {
  printf 'FAIL %s\n' "$1" >&2
  exit 1
}

request() {
  local base="$1"
  local path="$2"
  curl -sS -L -D "$tmp_headers" -o "$tmp_body" -w '%{http_code}' "$base$path"
}

require_http_ok() {
  local base="$1"
  local path="$2"
  local label="$3"
  local code
  code="$(request "$base" "$path")"
  case "$code" in
    200|301|302)
      pass "$label $path -> $code"
      ;;
    *)
      sed -n '1,40p' "$tmp_body" >&2
      fail "$label $path returned $code"
      ;;
  esac
}

require_json_fragment() {
  local base="$1"
  local path="$2"
  local fragment="$3"
  local label="$4"
  local code
  code="$(request "$base" "$path")"
  if [ "$code" != "200" ]; then
    sed -n '1,40p' "$tmp_body" >&2
    fail "$label $path returned $code"
  fi
  if ! grep -qi '^content-type: application/json' "$tmp_headers"; then
    sed -n '1,20p' "$tmp_headers" >&2
    sed -n '1,20p' "$tmp_body" >&2
    fail "$label $path did not return JSON"
  fi
  if ! grep -Fq "$fragment" "$tmp_body"; then
    sed -n '1,80p' "$tmp_body" >&2
    fail "$label $path JSON did not contain $fragment"
  fi
  pass "$label $path -> JSON contains $fragment"
}

printf '== Vindica serverless smoke test ==\n'
printf 'Frontend: %s\n' "$FRONTEND_URL"
printf 'API:      %s\n' "$API_URL"

require_http_ok "$FRONTEND_URL" "/" "frontend"
require_http_ok "$FRONTEND_URL" "/lookup" "frontend"
require_http_ok "$FRONTEND_URL" "/osint" "frontend"
require_http_ok "$FRONTEND_URL" "/manifest.webmanifest" "frontend"
require_http_ok "$FRONTEND_URL" "/sw.js" "frontend"

require_json_fragment "$API_URL" "/health" '"status":"ok"' "api"
require_json_fragment "$API_URL" "/ready" '"capabilities"' "api"

ready_body="$(cat "$tmp_body")"
case "$ready_body" in
  *'"status":"ready"'*)
    pass "api /ready -> ready"
    ;;
  *)
    if [ "$ALLOW_BLOCKED_READY" = "1" ]; then
      warn "api /ready is blocked; continuing because ALLOW_BLOCKED_READY=1"
    else
      echo "$ready_body" >&2
      fail "api /ready reported blockers"
    fi
    ;;
esac

require_json_fragment "$API_URL" "/ready" '"object_storage"' "api"
require_json_fragment "$API_URL" "/ready" '"outbound_email"' "api"
require_json_fragment "$API_URL" "/ready" '"serverless"' "api"

lookup_code="$(request "$API_URL" "/api/v1/lookups/username/github")"
case "$lookup_code" in
  200|401|403)
    pass "api /api/v1 prefix is routed -> $lookup_code"
    ;;
  *)
    sed -n '1,60p' "$tmp_body" >&2
    fail "api /api/v1 prefix returned $lookup_code"
    ;;
esac

phone_code="$(request "$API_URL" "/api/v1/lookups/phone/%2B14155552671")"
case "$phone_code" in
  200|401|403)
    pass "api phone lookup route -> $phone_code"
    ;;
  *)
    sed -n '1,60p' "$tmp_body" >&2
    fail "api phone lookup route returned $phone_code"
    ;;
esac

printf 'Serverless smoke test complete.\n'
