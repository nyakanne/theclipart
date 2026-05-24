#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${1:-/tmp/vindica-live-deploy-${STAMP}.tar.gz}"

cd "$ROOT_DIR"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "ERROR: working tree has uncommitted tracked changes."
  echo "Commit or stash tracked changes before packaging a live deploy."
  exit 1
fi

git archive --format=tar HEAD | gzip -9 > "$OUT"

"$ROOT_DIR/scripts/verify-live-archive.sh" "$OUT"

echo "Created live deploy archive:"
echo "$OUT"

