#!/bin/bash
# Backend checks: lint, format check, type-check, test
# This script is called by both CI and local check.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT/backend"

# Activate venv if it exists
if [ -f .venv/bin/activate ]; then
    source .venv/bin/activate
fi

echo "Running backend checks..."
echo ""

echo "→ Linting with ruff (warnings only)..."
ruff check . || true

echo ""
echo "→ Format checking with black (warnings only)..."
black --check . || true

echo ""
echo "→ Type checking with mypy..."
mypy app/

echo ""
echo "→ Running tests..."
python -m pytest -v

echo ""
echo "✅ Backend checks passed!"
