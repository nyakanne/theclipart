#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON="${PYTHON:-$ROOT/backend/.venv312/bin/python}"
NODE_BIN="${NODE_BIN:-/Users/anneshirleynyako/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin}"
NPM="${NPM:-/usr/local/bin/npm}"

echo "== Vindica production proof =="

echo "[1/6] Backend security tests"
(
  cd "$ROOT/backend"
  PYTHONPYCACHEPREFIX=/private/tmp/vindica-pycache "$PYTHON" -m pytest -q tests/test_production_security.py
)

echo "[2/6] Backend compilation"
(
  cd "$ROOT/backend"
  PYTHONPYCACHEPREFIX=/private/tmp/vindica-pycache "$PYTHON" -m compileall -q app
)

echo "[3/6] Frontend production build"
(
  cd "$ROOT/frontend"
  PATH="$NODE_BIN:/usr/local/bin:$PATH" "$NPM" run build
)

echo "[4/6] Compose validation"
if command -v docker >/dev/null 2>&1; then
  (
    cd "$ROOT"
    docker compose config --quiet
  )
elif [[ "${SKIP_DOCKER:-0}" == "1" ]]; then
  echo "SKIPPED: Docker is unavailable in this environment."
else
  echo "Docker is required for the complete production proof." >&2
  exit 1
fi

echo "[5/6] Secret-pattern audit"
if git -C "$ROOT" grep -nE 'ghp_[A-Za-z0-9]{20,}|AWS_SECRET_ACCESS_KEY=[A-Za-z0-9/+=]{20,}|BEGIN (RSA |OPENSSH )?PRIVATE KEY' -- ':!scripts/production-proof.sh'; then
  echo "Potential committed secret found." >&2
  exit 1
fi

echo "[6/6] Diff hygiene"
git -C "$ROOT" diff --check

echo "Production proof passed."
