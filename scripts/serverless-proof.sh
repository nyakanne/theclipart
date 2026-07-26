#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="/usr/local/bin:/opt/homebrew/bin:${PATH}"

cd "$ROOT_DIR"

echo "== Vindica serverless proof =="

echo "-- frontend static build"
(
  cd frontend
  npm run build
)

echo "-- backend import/compile proof"
backend/.venv312/bin/python -m compileall -q backend/app

echo "-- production security tests"
(
  cd backend
  .venv312/bin/python -m pytest -q tests/test_production_security.py
)

echo "-- shell scripts"
bash -n scripts/serverless-smoke-test.sh
bash -n scripts/serverless-proof.sh

echo "-- deployment config checks"
grep -q '"outputDirectory": "frontend/dist"' vercel.json
grep -q 'autoscaling.knative.dev/minScale: "0"' deploy/cloud-run/backend-service.yaml
grep -q 'SERVERLESS_PLATFORM' backend/.env.serverless.example
grep -q 'VITE_API_BASE_URL' frontend/.env.serverless.example

echo "-- whitespace checks"
git diff --check

echo "PASS serverless proof checks completed."
