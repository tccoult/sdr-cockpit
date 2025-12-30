#!/bin/bash
set -euo pipefail

# Build SDR Cockpit RPM from pre-built container image tar
# Usage: ./scripts/build-rpm-from-tar.sh <path-to-image.tar> [version] [release] [arch]
#
# Arguments:
#   image.tar  - Path to the container image tar file
#   version    - Package version (default: 0.1.0)
#   release    - Package release number (default: 1)
#   arch       - Target architecture: x86_64, aarch64, or noarch (default: noarch)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Check arguments
if [ $# -lt 1 ]; then
    echo "Usage: $0 <path-to-image.tar> [version] [release] [arch]"
    echo "Example: $0 /tmp/sdr-cockpit-image.tar 0.1.0 1 x86_64"
    echo ""
    echo "Architectures: x86_64, aarch64, noarch (default)"
    exit 1
fi

IMAGE_TAR="$1"
VERSION="${2:-0.1.0}"
RELEASE="${3:-1}"
TARGET_ARCH="${4:-noarch}"

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
echo "Architecture: $TARGET_ARCH"
echo ""

# Detect container runtime (only needed if rpmbuild not available)
CONTAINER_CMD=""
if ! command -v rpmbuild &> /dev/null; then
    if command -v docker &> /dev/null; then
        CONTAINER_CMD="docker"
    elif command -v podman &> /dev/null; then
        CONTAINER_CMD="podman"
    else
        echo "❌ rpmbuild not found and neither docker nor podman available"
        echo "Please install rpm-build or a container runtime"
        exit 1
    fi
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

# Determine RPM output directory based on architecture
if [ "$TARGET_ARCH" = "noarch" ]; then
    RPM_ARCH_DIR="noarch"
else
    RPM_ARCH_DIR="$TARGET_ARCH"
fi

# Build rpmbuild defines
RPMBUILD_DEFINES=(
    --define "_topdir $BUILD_DIR"
    --define "_version $VERSION"
    --define "_release $RELEASE"
)

# Add architecture define if not noarch
if [ "$TARGET_ARCH" != "noarch" ]; then
    RPMBUILD_DEFINES+=(--define "_target_arch $TARGET_ARCH")
fi

# Use native rpmbuild if available, otherwise use container
if [ -z "$CONTAINER_CMD" ]; then
    echo "Using native rpmbuild"
    rpmbuild "${RPMBUILD_DEFINES[@]}" -bb "$BUILD_DIR/SPECS/sdr-cockpit.spec"
else
    echo "Using container runtime: $CONTAINER_CMD"
    echo ""

    # Build defines string for container
    DEFINES_STR="--define '_topdir /rpmbuild' --define '_version $VERSION' --define '_release $RELEASE'"
    if [ "$TARGET_ARCH" != "noarch" ]; then
        DEFINES_STR="$DEFINES_STR --define '_target_arch $TARGET_ARCH'"
    fi

    $CONTAINER_CMD run --rm \
        -v "$BUILD_DIR":/rpmbuild:Z \
        almalinux:9 \
        bash -c "
            dnf install -y rpm-build
            rpmbuild $DEFINES_STR -bb /rpmbuild/SPECS/sdr-cockpit.spec
        "
fi

# Copy RPM to project root
echo ""
echo "📋 Copying RPM to project root..."
cp "$BUILD_DIR/RPMS/$RPM_ARCH_DIR/"*.rpm "$PROJECT_ROOT/"

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
