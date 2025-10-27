#!/bin/bash
# Simulator checks: test
# This script is called by both CI and local check.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT/simulator"

# Activate venv if it exists
if [ -f .venv/bin/activate ]; then
    source .venv/bin/activate
fi

echo "Running simulator checks..."
echo ""

echo "→ Running tests..."
python -m pytest -v

echo ""
echo "✅ Simulator checks passed!"
