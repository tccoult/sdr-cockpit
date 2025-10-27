#!/bin/bash
# Build RPM package for air-gapped deployment
# Bundles container image + systemd service

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Detect container runtime (docker or podman)
if command -v docker &> /dev/null; then
    CONTAINER_CMD="docker"
elif command -v podman &> /dev/null; then
    CONTAINER_CMD="podman"
else
    echo "❌ Neither docker nor podman found. Please install one."
    exit 1
fi

# Configuration
IMAGE_NAME="${IMAGE_NAME:-sdr-cockpit}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
VERSION="${VERSION:-0.1.0}"
RELEASE="${RELEASE:-1}"

echo "📦 Building SDR Cockpit RPM package..."
echo "   Version: $VERSION-$RELEASE"
echo ""

# Step 1: Build the container image
echo "🏗️  Building container image with $CONTAINER_CMD..."
cd "$PROJECT_ROOT"
$CONTAINER_CMD build -f docker/sdr-cockpit.Dockerfile -t "$IMAGE_NAME:$IMAGE_TAG" .

# Step 2: Export container image as tar
echo "💾 Exporting container image..."
IMAGE_TAR="$PROJECT_ROOT/sdr-cockpit-image.tar"
$CONTAINER_CMD save "$IMAGE_NAME:$IMAGE_TAG" -o "$IMAGE_TAR"

# Step 3: Build RPM from tar
echo ""
"$SCRIPT_DIR/build-rpm-from-tar.sh" "$IMAGE_TAR" "$VERSION" "$RELEASE"

# Cleanup temporary tar
rm -f "$IMAGE_TAR"
