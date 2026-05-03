#!/usr/bin/env bash
# start-ui.sh — Start the Bounty Agent UI (frontend + backend)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/ui/frontend"
BACKEND_DIR="$SCRIPT_DIR/ui/backend"

echo "🔐 Bounty Agent UI"
echo "━━━━━━━━━━━━━━━━━━"

# Check required env
if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
  echo "⚠️  ANTHROPIC_API_KEY not set (needed to run hunts)"
fi
if [[ -z "${H1_USERNAME:-}" || -z "${H1_API_TOKEN:-}" ]]; then
  echo "⚠️  H1_USERNAME / H1_API_TOKEN not set (needed for HackerOne API)"
fi

# Install backend deps
echo ""
echo "→ Installing backend dependencies..."
pip install -q -r "$BACKEND_DIR/requirements.txt"

# Install frontend deps + build
echo "→ Installing frontend dependencies..."
cd "$FRONTEND_DIR"
npm install --silent

# Determine mode
MODE="${1:-dev}"

if [[ "$MODE" == "build" ]]; then
  echo "→ Building frontend for production..."
  npm run build
  echo ""
  echo "✅ Frontend built to ui/frontend/dist/"
  echo "→ Starting backend (serves built frontend at http://localhost:7331)..."
  cd "$BACKEND_DIR"
  exec python app.py
fi

# Dev mode: run both concurrently
echo ""
echo "✅ Starting Bounty Agent UI in dev mode"
echo "   Frontend → http://localhost:5173"
echo "   Backend  → http://localhost:7331"
echo ""

# Start backend in background
cd "$BACKEND_DIR"
python app.py &
BACKEND_PID=$!

# Start frontend in foreground
cd "$FRONTEND_DIR"
npm run dev

# Cleanup on exit
kill $BACKEND_PID 2>/dev/null || true
