#!/usr/bin/env bash
set -e

# Generate TypeScript and Python types from OpenAPI spec
# This is the single source of truth for API types

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OPENAPI_FILE="$PROJECT_ROOT/openapi.yaml"

echo "🔧 Generating types from OpenAPI spec..."
echo ""

# Check that openapi.yaml exists
if [ ! -f "$OPENAPI_FILE" ]; then
    echo "❌ Error: openapi.yaml not found at $OPENAPI_FILE"
    exit 1
fi

# Generate TypeScript types
echo "→ Generating TypeScript types..."
cd "$PROJECT_ROOT/frontend"
npm run generate:types
echo "✅ TypeScript types generated"
echo ""

# Generate Python models
echo "→ Generating Python models..."
cd "$PROJECT_ROOT/backend"
.venv/bin/datamodel-codegen \
    --input ../openapi.yaml \
    --output app/models/generated.py \
    --snake-case-field \
    --use-standard-collections \
    --use-schema-description \
    --reuse-model \
    --field-constraints \
    --use-default \
    --use-default-kwarg
echo "✅ Python models generated"
echo ""

# Format Python with black
echo "→ Formatting Python models with black..."
.venv/bin/black app/models/generated.py
echo "✅ Python models formatted"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All types generated successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
