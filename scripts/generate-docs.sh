#!/bin/bash

# Generate OpenAPI HTML documentation using Redoc
# This creates beautiful, interactive API documentation from openapi.yaml

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Generating OpenAPI documentation...${NC}"

# Ensure we're in the repo root
cd "$(dirname "$0")/.."

# Create docs/api directory if it doesn't exist
mkdir -p docs/api

# Generate HTML documentation using Redoc
npx @redocly/cli build-docs openapi.yaml -o docs/api/index.html

echo -e "${GREEN}✓ Documentation generated at docs/api/index.html${NC}"
echo ""
echo "To view:"
echo "  - Open docs/api/index.html in your browser"
echo "  - Or run: open docs/api/index.html (macOS)"
echo "  - Or run: xdg-open docs/api/index.html (Linux)"
