#!/bin/bash
set -e

# Script to generate TypeScript types from OpenAPI and protobuf schemas
# This keeps frontend and backend types in sync

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Generating API Types and Protobuf Code"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ============================================================================
# 1. Generate Protobuf Code
# ============================================================================

echo ""
echo "→ Generating protobuf code..."

# Python protobuf generation
echo "  • Python protobuf (backend/app/proto/)"
cd "$PROJECT_ROOT"
python -m grpc_tools.protoc \
  -I=api \
  --python_out=backend/app/proto \
  api/spectral_data.proto

# TypeScript protobuf generation
echo "  • TypeScript protobuf (frontend/src/proto/)"
cd "$PROJECT_ROOT/frontend"
./node_modules/.bin/pbjs \
  -t static-module \
  -w es6 \
  -o src/proto/spectral_data.js \
  ../api/spectral_data.proto

./node_modules/.bin/pbts \
  -o src/proto/spectral_data.d.ts \
  src/proto/spectral_data.js

echo "✅ Protobuf code generated"

# ============================================================================
# 2. Generate OpenAPI Schema (Future)
# ============================================================================

echo ""
echo "→ OpenAPI type generation (TODO)"
echo "  • FastAPI generates OpenAPI schema automatically at /openapi.json"
echo "  • To add: Export schema and generate TypeScript types"
echo "  • Consider: openapi-typescript or openapi-typescript-codegen"

# Placeholder for future implementation:
# cd "$PROJECT_ROOT/backend"
# python -m app.main --export-openapi > ../api/openapi.json
# cd "$PROJECT_ROOT/frontend"
# npx openapi-typescript ../api/openapi.json -o src/api/generated/api-types.ts

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Type generation complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
