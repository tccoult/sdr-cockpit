#!/bin/bash
# Frontend checks: lint, type-check, test, build
# This script is called by both CI and local check.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT/frontend"

echo "Running frontend checks..."
echo ""

echo "→ Linting..."
npm run lint

echo ""
echo "→ Type checking..."
npm run type-check

echo ""
echo "→ Running tests (offline mode)..."
VITE_API_MODE=offline npm test

echo ""
echo "→ Building..."
npm run build

echo ""
echo "✅ Frontend checks passed!"
