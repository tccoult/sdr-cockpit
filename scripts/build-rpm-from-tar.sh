#!/bin/bash
set -euo pipefail

# Build SDR Cockpit RPM from pre-built container image tar
# Usage: ./scripts/build-rpm-from-tar.sh <path-to-image.tar> [version] [release]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Check arguments
if [ $# -lt 1 ]; then
    echo "Usage: $0 <path-to-image.tar> [version] [release]"
    echo "Example: $0 /tmp/sdr-cockpit-image.tar 0.1.0 1"
    exit 1
fi

IMAGE_TAR="$1"
VERSION="${2:-0.1.0}"
RELEASE="${3:-1}"

# Verify image tar exists
if [ ! -f "$IMAGE_TAR" ]; then
    echo "❌ Image tar not found: $IMAGE_TAR"
    exit 1
fi

echo "=================================================="
echo "Building SDR Cockpit RPM Package"
echo "=================================================="
echo "Image tar: $IMAGE_TAR"
echo "Version: $VERSION"
echo "Release: $RELEASE"
echo ""

# Detect container runtime
if command -v docker &> /dev/null; then
    CONTAINER_CMD="docker"
elif command -v podman &> /dev/null; then
    CONTAINER_CMD="podman"
else
    echo "❌ Neither docker nor podman found"
    echo "Please install one of them to build RPM packages"
    exit 1
fi

# Create build directory
BUILD_DIR="$PROJECT_ROOT/rpmbuild"
mkdir -p "$BUILD_DIR"/{SOURCES,SPECS,RPMS,SRPMS,BUILD}

# Copy sources
echo "📦 Preparing RPM build sources..."
cp "$IMAGE_TAR" "$BUILD_DIR/SOURCES/sdr-cockpit-image.tar"
cp "$PROJECT_ROOT/rpm/sdr-cockpit.service" "$BUILD_DIR/SOURCES/"
cp "$PROJECT_ROOT/rpm/sdr-cockpit.spec" "$BUILD_DIR/SPECS/"

# Build RPM
echo ""
echo "🔨 Building RPM package..."
echo ""

# Check if rpmbuild is available natively (e.g., in CI)
if command -v rpmbuild &> /dev/null; then
    echo "Using native rpmbuild"
    rpmbuild \
        --define "_topdir $BUILD_DIR" \
        --define "_version $VERSION" \
        --define "_release $RELEASE" \
        -bb "$BUILD_DIR/SPECS/sdr-cockpit.spec"
else
    echo "Using container runtime: $CONTAINER_CMD"
    echo ""

    $CONTAINER_CMD run --rm \
        -v "$BUILD_DIR":/rpmbuild:Z \
        almalinux:9 \
        bash -c "
            dnf install -y rpm-build
            rpmbuild \
                --define '_topdir /rpmbuild' \
                --define '_version $VERSION' \
                --define '_release $RELEASE' \
                -bb /rpmbuild/SPECS/sdr-cockpit.spec
        "
fi

# Copy RPM to project root
echo ""
echo "📋 Copying RPM to project root..."
cp "$BUILD_DIR/RPMS/noarch/"*.rpm "$PROJECT_ROOT/"

echo ""
echo "=================================================="
echo "✅ RPM build complete!"
echo "=================================================="
echo ""
ls -lh "$PROJECT_ROOT/"*.rpm
echo ""
echo "To install: sudo dnf install -y ./sdr-cockpit-*.rpm"
echo "To start: sudo systemctl start sdr-cockpit"
echo "To check status: sudo systemctl status sdr-cockpit"
