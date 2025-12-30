#!/bin/bash
# Build RPM package for air-gapped deployment
# Bundles container image + systemd service
#
# Usage: ./build-rpm.sh [--platform PLATFORM]
#
# Options:
#   --platform PLATFORM  Build for specific platform (linux/amd64 or linux/arm64)
#                        Default: builds for host architecture
#
# Environment variables:
#   IMAGE_NAME  - Container image name (default: sdr-cockpit)
#   IMAGE_TAG   - Container image tag (default: latest)
#   VERSION     - RPM version (default: 0.1.0)
#   RELEASE     - RPM release number (default: 1)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Parse arguments
PLATFORM=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --platform)
            PLATFORM="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

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

# Determine target architecture from platform
if [ -n "$PLATFORM" ]; then
    case "$PLATFORM" in
        linux/amd64)
            TARGET_ARCH="x86_64"
            ;;
        linux/arm64)
            TARGET_ARCH="aarch64"
            ;;
        *)
            echo "❌ Unsupported platform: $PLATFORM"
            echo "   Supported: linux/amd64, linux/arm64"
            exit 1
            ;;
    esac
else
    TARGET_ARCH="noarch"
fi

echo "📦 Building SDR Cockpit RPM package..."
echo "   Version: $VERSION-$RELEASE"
if [ -n "$PLATFORM" ]; then
    echo "   Platform: $PLATFORM"
    echo "   Architecture: $TARGET_ARCH"
fi
echo ""

# Step 1: Build the container image
echo "🏗️  Building container image with $CONTAINER_CMD..."
cd "$PROJECT_ROOT"

BUILD_ARGS=(-f docker/sdr-cockpit.Dockerfile -t "$IMAGE_NAME:$IMAGE_TAG")
if [ -n "$PLATFORM" ]; then
    BUILD_ARGS+=(--platform "$PLATFORM")
fi

$CONTAINER_CMD build "${BUILD_ARGS[@]}" .

# Step 2: Export container image as tar
echo "💾 Exporting container image..."
IMAGE_TAR="$PROJECT_ROOT/sdr-cockpit-image.tar"
$CONTAINER_CMD save "$IMAGE_NAME:$IMAGE_TAG" -o "$IMAGE_TAR"

# Step 3: Build RPM from tar
echo ""
"$SCRIPT_DIR/build-rpm-from-tar.sh" "$IMAGE_TAR" "$VERSION" "$RELEASE" "$TARGET_ARCH"

# Cleanup temporary tar
rm -f "$IMAGE_TAR"
