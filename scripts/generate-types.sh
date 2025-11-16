#!/usr/bin/env bash
set -e

# Generate TypeScript and Python types from API schemas
# OpenAPI for REST API types, Protobuf for binary spectral data

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OPENAPI_FILE="$PROJECT_ROOT/api/openapi.yaml"
PROTOBUF_FILE="$PROJECT_ROOT/api/spectral_data.proto"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Generating API Types and Protobuf Code"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check that schema files exist
if [ ! -f "$OPENAPI_FILE" ]; then
    echo "❌ Error: openapi.yaml not found at $OPENAPI_FILE"
    exit 1
fi

if [ ! -f "$PROTOBUF_FILE" ]; then
    echo "❌ Error: spectral_data.proto not found at $PROTOBUF_FILE"
    exit 1
fi

# Generate TypeScript types
echo "→ Generating TypeScript types..."
cd "$PROJECT_ROOT/frontend"
npm run generate:types
echo "✅ TypeScript types generated"
echo ""

# Generate Python models
echo "→ Generating Python models from OpenAPI..."
cd "$PROJECT_ROOT/backend"
.venv/bin/datamodel-codegen \
    --input ../api/openapi.yaml \
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

# Generate Python protobuf code
echo "→ Generating Python protobuf code..."
cd "$PROJECT_ROOT"
python -m grpc_tools.protoc \
    -I=api \
    --python_out=backend/app/proto \
    api/spectral_data.proto
echo "✅ Python protobuf generated"
echo ""

# Generate TypeScript protobuf code
echo "→ Generating TypeScript protobuf code..."
cd "$PROJECT_ROOT/frontend"
./node_modules/.bin/pbjs \
    -t static-module \
    -w es6 \
    -o src/proto/spectral_data.js \
    ../api/spectral_data.proto

./node_modules/.bin/pbts \
    -o src/proto/spectral_data.d.ts \
    src/proto/spectral_data.js
echo "✅ TypeScript protobuf generated"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All types generated successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
