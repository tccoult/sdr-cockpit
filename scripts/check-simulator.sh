#!/bin/bash
# Simulator checks: test
# This script is called by both CI and local check.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT/simulator"

echo "Running simulator checks..."
echo ""

echo "→ Running tests..."
uv run pytest -v

echo ""
echo "✅ Simulator checks passed!"
