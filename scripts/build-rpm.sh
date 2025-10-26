#!/bin/bash
# Build RPM package for air-gapped deployment
# Bundles container image + systemd service

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
IMAGE_NAME="${IMAGE_NAME:-sdr-cockpit}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
VERSION="${VERSION:-0.1.0}"
RELEASE="${RELEASE:-1}"

# RPM build directories
BUILD_DIR="$PROJECT_ROOT/rpmbuild"
SOURCES_DIR="$BUILD_DIR/SOURCES"
SPECS_DIR="$BUILD_DIR/SPECS"
RPMS_DIR="$BUILD_DIR/RPMS"

echo "📦 Building SDR Cockpit RPM package..."
echo "   Version: $VERSION-$RELEASE"
echo ""

# Clean and create build directories
rm -rf "$BUILD_DIR"
mkdir -p "$SOURCES_DIR" "$SPECS_DIR" "$RPMS_DIR"

# Step 1: Build the container image
echo "🏗️  Building container image..."
cd "$PROJECT_ROOT"
docker build -f docker/sdr-cockpit.Dockerfile -t "$IMAGE_NAME:$IMAGE_TAG" .

# Step 2: Export container image as tar
echo "💾 Exporting container image..."
docker save "$IMAGE_NAME:$IMAGE_TAG" -o "$SOURCES_DIR/sdr-cockpit-image.tar"

# Step 3: Copy systemd service file
echo "📋 Copying systemd service file..."
cp "$PROJECT_ROOT/rpm/sdr-cockpit.service" "$SOURCES_DIR/"

# Step 4: Copy spec file
echo "📄 Copying RPM spec file..."
cp "$PROJECT_ROOT/rpm/sdr-cockpit.spec" "$SPECS_DIR/"

# Step 5: Build RPM
echo "🔨 Building RPM..."
rpmbuild \
    --define "_topdir $BUILD_DIR" \
    --define "_version $VERSION" \
    --define "_release $RELEASE" \
    -bb "$SPECS_DIR/sdr-cockpit.spec"

# Step 6: Copy RPM to project root
echo "📦 Copying RPM to project root..."
cp "$BUILD_DIR/RPMS/noarch/"*.rpm "$PROJECT_ROOT/"

RPM_FILE=$(ls "$PROJECT_ROOT/"sdr-cockpit*.rpm)

echo ""
echo "✅ RPM build complete!"
echo ""
echo "Package: $(basename $RPM_FILE)"
echo "Size: $(du -h $RPM_FILE | cut -f1)"
echo ""
echo "Install on target system:"
echo "  sudo dnf install -y $RPM_FILE"
echo "  sudo systemctl start sdr-cockpit"
echo ""
echo "Note: Target system needs podman and redis installed."
