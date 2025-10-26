#!/bin/bash
# Production container build script
# Builds the production Docker image with frontend and backend

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default image name
IMAGE_NAME="${IMAGE_NAME:-sdr-cockpit}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
REGISTRY="${REGISTRY:-ghcr.io/tccoult}"

echo "🏗️  Building SDR Cockpit production image..."
echo ""
echo "Image: $REGISTRY/$IMAGE_NAME:$IMAGE_TAG"
echo ""

cd "$PROJECT_ROOT"

# Build the image
docker build \
    -f docker/backend.Dockerfile \
    -t "$IMAGE_NAME:$IMAGE_TAG" \
    -t "$REGISTRY/$IMAGE_NAME:$IMAGE_TAG" \
    .

echo ""
echo "✅ Build complete!"
echo ""
echo "Local tag:  $IMAGE_NAME:$IMAGE_TAG"
echo "Registry tag: $REGISTRY/$IMAGE_NAME:$IMAGE_TAG"
echo ""
echo "To run locally:"
echo "  docker run -p 8000:8000 $IMAGE_NAME:$IMAGE_TAG"
echo ""
echo "To push to registry:"
echo "  docker push $REGISTRY/$IMAGE_NAME:$IMAGE_TAG"
