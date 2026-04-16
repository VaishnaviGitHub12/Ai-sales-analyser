#!/bin/bash
# run.sh — starts both backend and frontend with one command

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "🚀  AI Sales Analyser"
echo "────────────────────────────────────────"

# ── Backend ───────────────────────────────────────────────────────────────────
echo "▸ Starting FastAPI backend on http://localhost:8000"

cd "$ROOT/backend"

if [ ! -f ".env" ]; then
  echo ""
  echo "⚠️  No .env file found in backend/"
  echo "   Please create one from .env.example:"
  echo "   cp backend/.env.example backend/.env"
  echo "   Then add your ANTHROPIC_API_KEY."
  echo ""
  exit 1
fi

# Activate venv if present
if [ -d "venv" ]; then
  source venv/bin/activate
fi

export $(grep -v '^#' .env | xargs)
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# ── Frontend ──────────────────────────────────────────────────────────────────
echo "▸ Starting React frontend on http://localhost:5173"

cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅  Both servers running."
echo "   Frontend → http://localhost:5173"
echo "   API docs  → http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both."
echo "────────────────────────────────────────"

# Wait and clean up on exit
trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
