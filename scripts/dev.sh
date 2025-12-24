#!/bin/bash
# Development environment startup script
# Runs frontend dev server and backend with auto-reload

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 Starting SDR Cockpit development environment..."
echo ""

# Ensure dependencies are installed
"$SCRIPT_DIR/setup.sh"

echo ""
echo "Starting services:"
echo "  - Frontend dev server: http://localhost:3000"
echo "  - Backend API: http://localhost:8000"
echo "  - Backend health: http://localhost:8000/api/health"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Start backend in background with DEBUG logging
cd "$PROJECT_ROOT/backend"
SDR_CORS_ALLOW_ORIGINS="*" ZSTD_COMPRESSION_LEVEL=3 LOG_LEVEL=DEBUG uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Start frontend in foreground
cd "$PROJECT_ROOT/frontend"
npm run dev

# Cleanup on exit
trap "kill $BACKEND_PID 2>/dev/null || true" EXIT
