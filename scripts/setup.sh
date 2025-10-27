#!/bin/bash
# Setup development environment
# Installs all dependencies for frontend, backend, and simulator

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🔧 Setting up SDR Cockpit development environment..."
echo ""

# Check prerequisites
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 20+"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo "❌ Python not found. Please install Python 3.11+"
    exit 1
fi

# Frontend dependencies
if [ ! -d "$PROJECT_ROOT/frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd "$PROJECT_ROOT/frontend"
    npm install
else
    echo "✅ Frontend dependencies already installed"
fi

# Backend dependencies
if [ ! -d "$PROJECT_ROOT/backend/.venv" ]; then
    echo "📦 Installing backend dependencies..."
    cd "$PROJECT_ROOT/backend"
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -q --upgrade pip
    pip install -q -r requirements.txt
else
    echo "✅ Backend dependencies already installed"
fi

# Simulator dependencies
if [ ! -d "$PROJECT_ROOT/simulator/.venv" ]; then
    echo "📦 Installing simulator dependencies..."
    cd "$PROJECT_ROOT/simulator"
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -q --upgrade pip
    pip install -q -r requirements.txt
else
    echo "✅ Simulator dependencies already installed"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Run tests: ./scripts/test.sh"
echo "Start dev: ./scripts/dev.sh"
