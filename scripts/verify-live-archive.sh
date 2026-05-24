#!/usr/bin/env bash
set -euo pipefail

ARCHIVE="${1:-}"

if [ -z "$ARCHIVE" ]; then
  echo "Usage: $0 /path/to/vindica-live-deploy.tar.gz"
  exit 2
fi

if [ ! -f "$ARCHIVE" ]; then
  echo "ERROR: archive not found: $ARCHIVE"
  exit 1
fi

required_paths=(
  "backend/Dockerfile"
  "backend/app/main.py"
  "backend/requirements.txt"
  "frontend/Dockerfile"
  "frontend/index.html"
  "frontend/package.json"
  "frontend/package-lock.json"
  "frontend/src/App.tsx"
  "docker-compose.yml"
)

listing="$(tar -tzf "$ARCHIVE")"

for path in "${required_paths[@]}"; do
  if ! grep -qx "$path" <<< "$listing"; then
    echo "ERROR: archive missing required path: $path"
    exit 1
  fi
done

for forbidden in "frontend/node_modules/" "frontend/dist/" "frontend.backup." "dist.backup."; do
  if grep -q "$forbidden" <<< "$listing"; then
    echo "ERROR: archive contains forbidden deploy payload: $forbidden"
    exit 1
  fi
done

if grep -Exq '(\.env|backend/\.env|frontend/\.env|.*\.local)$' <<< "$listing"; then
  echo "ERROR: archive contains a local secret env file"
  exit 1
fi

echo "Archive verified: $ARCHIVE"
