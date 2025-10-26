#!/bin/bash
# Run production container locally for testing
# This is useful for testing the production build before deploying

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

IMAGE_NAME="${IMAGE_NAME:-sdr-cockpit}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

echo "🚀 Running SDR Cockpit production container locally..."
echo ""

# Check if image exists
if ! docker image inspect "$IMAGE_NAME:$IMAGE_TAG" &>/dev/null; then
    echo "❌ Image $IMAGE_NAME:$IMAGE_TAG not found."
    echo "Build it first with: ./scripts/build-prod.sh"
    exit 1
fi

# Check if Redis is running
if ! docker ps | grep -q redis; then
    echo "📦 Starting Redis..."
    docker run -d --name redis -p 6379:6379 redis:7-alpine
fi

echo "Starting container..."
echo "  Image: $IMAGE_NAME:$IMAGE_TAG"
echo "  Port: 8000"
echo ""

# Run the container
docker run --rm -it \
    --name sdr-cockpit \
    -p 8000:8000 \
    -e REDIS_HOST=host.docker.internal \
    -e REDIS_PORT=6379 \
    "$IMAGE_NAME:$IMAGE_TAG"
