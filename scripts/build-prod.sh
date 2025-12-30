#!/bin/bash
# Production container build script
# Supports multi-architecture builds (amd64/arm64) with manifest creation
#
# Usage:
#   ./build-prod.sh                    # Single-arch build for local use
#   ./build-prod.sh --multiarch --push # Multi-arch build with registry push
#
# Environment variables:
#   IMAGE_NAME  - Image name (default: sdr-cockpit)
#   IMAGE_TAG   - Image tag (default: latest)
#   REGISTRY    - Container registry (default: ghcr.io/tccoult)
#   PLATFORMS   - Comma-separated platforms (default: linux/amd64,linux/arm64)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default configuration
IMAGE_NAME="${IMAGE_NAME:-sdr-cockpit}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
REGISTRY="${REGISTRY:-ghcr.io/tccoult}"
PLATFORMS="${PLATFORMS:-linux/amd64,linux/arm64}"
BUILDER_NAME="sdr-multiarch-builder"

# Parse arguments
MULTIARCH=false
PUSH=false
LOAD=false
PLATFORM_OVERRIDE=""

show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Build SDR Cockpit production container image.

Options:
    --multiarch         Build for multiple architectures (amd64 + arm64)
    --push              Push image/manifest to registry
    --load              Load image into local daemon (single-arch only)
    --platform PLAT     Override platform(s) (e.g., linux/amd64,linux/arm64)
    -h, --help          Show this help message

Environment Variables:
    IMAGE_NAME          Image name (default: sdr-cockpit)
    IMAGE_TAG           Image tag (default: latest)
    REGISTRY            Container registry (default: ghcr.io/tccoult)
    PLATFORMS           Default platforms for --multiarch (default: linux/amd64,linux/arm64)

Examples:
    # Build single-arch for local development
    $0 --load

    # Build multi-arch and push manifest to registry
    $0 --multiarch --push

    # Build specific platform
    $0 --platform linux/arm64 --load

    # Build multi-arch with custom registry
    REGISTRY=myregistry.io/myorg $0 --multiarch --push
EOF
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --multiarch)
            MULTIARCH=true
            shift
            ;;
        --push)
            PUSH=true
            shift
            ;;
        --load)
            LOAD=true
            shift
            ;;
        --platform)
            PLATFORM_OVERRIDE="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validation
if [[ "$MULTIARCH" == true && "$LOAD" == true ]]; then
    echo "❌ Error: --multiarch and --load cannot be used together."
    echo "   Multi-arch builds must be pushed to a registry (--push)."
    exit 1
fi

if [[ "$MULTIARCH" == true && "$PUSH" != true ]]; then
    echo "❌ Error: --multiarch requires --push."
    echo "   Multi-arch manifests must be pushed to a registry."
    exit 1
fi

# Determine platforms to build
if [[ -n "$PLATFORM_OVERRIDE" ]]; then
    BUILD_PLATFORMS="$PLATFORM_OVERRIDE"
elif [[ "$MULTIARCH" == true ]]; then
    BUILD_PLATFORMS="$PLATFORMS"
else
    # Default to native architecture for single-arch builds
    BUILD_PLATFORMS=""
fi

# Full image reference
FULL_IMAGE="$REGISTRY/$IMAGE_NAME:$IMAGE_TAG"

echo "=============================================="
echo "SDR Cockpit Production Build"
echo "=============================================="
echo ""
echo "Image:      $IMAGE_NAME:$IMAGE_TAG"
echo "Registry:   $REGISTRY"
echo "Full ref:   $FULL_IMAGE"
echo "Multi-arch: $MULTIARCH"
if [[ -n "$BUILD_PLATFORMS" ]]; then
    echo "Platforms:  $BUILD_PLATFORMS"
fi
echo "Push:       $PUSH"
echo "Load:       $LOAD"
echo ""

cd "$PROJECT_ROOT"

# Setup buildx builder for multi-arch builds
setup_buildx_builder() {
    echo "🔧 Setting up buildx builder for multi-arch builds..."

    # Check if builder exists
    if docker buildx inspect "$BUILDER_NAME" &>/dev/null; then
        echo "   Using existing builder: $BUILDER_NAME"
        docker buildx use "$BUILDER_NAME"
    else
        echo "   Creating new builder: $BUILDER_NAME"
        docker buildx create \
            --name "$BUILDER_NAME" \
            --driver docker-container \
            --bootstrap \
            --use
    fi

    # Verify platforms are available
    echo "   Verifying platform support..."
    docker buildx inspect --bootstrap
    echo ""
}

# Build single-architecture image
build_single_arch() {
    echo "🏗️  Building single-architecture image..."

    local build_args=(
        -f docker/sdr-cockpit.Dockerfile
        -t "$IMAGE_NAME:$IMAGE_TAG"
        -t "$FULL_IMAGE"
    )

    if [[ -n "$BUILD_PLATFORMS" ]]; then
        build_args+=(--platform "$BUILD_PLATFORMS")
    fi

    if [[ "$LOAD" == true ]]; then
        build_args+=(--load)
    fi

    if [[ "$PUSH" == true ]]; then
        build_args+=(--push)
    fi

    docker buildx build "${build_args[@]}" .
}

# Build multi-architecture image with manifest
build_multi_arch() {
    echo "🏗️  Building multi-architecture image..."
    echo "   Platforms: $BUILD_PLATFORMS"
    echo ""

    # Multi-arch builds require pushing directly (can't load multi-arch locally)
    docker buildx build \
        -f docker/sdr-cockpit.Dockerfile \
        --platform "$BUILD_PLATFORMS" \
        -t "$FULL_IMAGE" \
        --push \
        .

    echo ""
    echo "📋 Manifest created and pushed for platforms: $BUILD_PLATFORMS"
}

# Main build logic
if [[ "$MULTIARCH" == true ]]; then
    setup_buildx_builder
    build_multi_arch
else
    # Use buildx for consistent behavior, even for single-arch
    if [[ -n "$BUILD_PLATFORMS" ]] || [[ "$PUSH" == true ]]; then
        setup_buildx_builder
    fi
    build_single_arch
fi

echo ""
echo "=============================================="
echo "✅ Build complete!"
echo "=============================================="
echo ""

if [[ "$PUSH" == true ]]; then
    echo "Image pushed to: $FULL_IMAGE"
    if [[ "$MULTIARCH" == true ]]; then
        echo ""
        echo "Manifest includes:"
        for plat in ${BUILD_PLATFORMS//,/ }; do
            echo "  - $plat"
        done
    fi
elif [[ "$LOAD" == true ]]; then
    echo "Image loaded locally:"
    echo "  - $IMAGE_NAME:$IMAGE_TAG"
    echo "  - $FULL_IMAGE"
    echo ""
    echo "To run locally:"
    echo "  docker run -p 8000:8000 $IMAGE_NAME:$IMAGE_TAG"
else
    echo "Image built (not loaded or pushed)"
    echo ""
    echo "To load into local daemon:"
    echo "  $0 --load"
    echo ""
    echo "To push to registry:"
    echo "  $0 --push"
fi
echo ""
