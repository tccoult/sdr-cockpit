#!/bin/bash
# Development environment startup script
# Runs frontend dev server and backend with auto-reload

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 Starting SDR Cockpit development environment..."
echo ""

# Check if we're in the dev container or have the right tools
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please use the dev container or install Node.js 20+"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo "❌ Python not found. Please use the dev container or install Python 3.11+"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "$PROJECT_ROOT/frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd "$PROJECT_ROOT/frontend"
    npm install
fi

if [ ! -d "$PROJECT_ROOT/backend/.venv" ]; then
    echo "📦 Installing backend dependencies..."
    cd "$PROJECT_ROOT/backend"
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
fi

echo ""
echo "Starting services:"
echo "  - Frontend dev server: http://localhost:5173"
echo "  - Backend API: http://localhost:8000"
echo "  - Backend health: http://localhost:8000/api/health"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Start backend in background
cd "$PROJECT_ROOT/backend"
if [ -f .venv/bin/activate ]; then
    source .venv/bin/activate
fi
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Start frontend in foreground
cd "$PROJECT_ROOT/frontend"
npm run dev

# Cleanup on exit
trap "kill $BACKEND_PID 2>/dev/null || true" EXIT
