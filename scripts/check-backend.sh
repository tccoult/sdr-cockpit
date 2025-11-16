#!/bin/bash
# Backend checks: lint, format check, type-check, test
# This script is called by both CI and local check.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT/backend"

echo "Running backend checks..."
echo ""

echo "→ Linting with ruff (warnings only)..."
uv run ruff check . || true

echo ""
echo "→ Format checking with black (warnings only)..."
uv run black --check . || true

echo ""
echo "→ Type checking with mypy..."
uv run mypy app/

echo ""
echo "→ Running tests..."
uv run pytest -v

echo ""
echo "✅ Backend checks passed!"
