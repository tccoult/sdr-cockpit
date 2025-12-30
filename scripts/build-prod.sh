#!/bin/bash
# Production container build script
# Supports multi-architecture builds (amd64/arm64) with manifest creation
# Works with both Docker and Podman
#
# Usage:
#   ./build-prod.sh                    # Build for local use
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

# Parse arguments
MULTIARCH=false
PUSH=false
PLATFORM_OVERRIDE=""

show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Build SDR Cockpit production container image.
Supports both Docker and Podman container runtimes.

Options:
    --multiarch         Build for multiple architectures (amd64 + arm64)
    --push              Push image/manifest to registry
    --platform PLAT     Build for specific platform (e.g., linux/arm64)
    -h, --help          Show this help message

Environment Variables:
    IMAGE_NAME          Image name (default: sdr-cockpit)
    IMAGE_TAG           Image tag (default: latest)
    REGISTRY            Container registry (default: ghcr.io/tccoult)
    PLATFORMS           Default platforms for --multiarch (default: linux/amd64,linux/arm64)

Examples:
    # Build for local development (native arch)
    $0

    # Build for specific platform
    $0 --platform linux/arm64

    # Build multi-arch and push manifest to registry
    $0 --multiarch --push

    # Build and push single-arch to registry
    $0 --push
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
if [[ "$MULTIARCH" == true && "$PUSH" != true ]]; then
    echo "Error: --multiarch requires --push."
    echo "   Multi-arch manifests must be pushed to a registry."
    exit 1
fi

# Detect container runtime
detect_runtime() {
    if command -v docker &> /dev/null; then
        # Check if it's actually podman aliased as docker
        if docker --version 2>&1 | grep -qi podman; then
            echo "podman"
        else
            echo "docker"
        fi
    elif command -v podman &> /dev/null; then
        echo "podman"
    else
        echo "none"
    fi
}

RUNTIME=$(detect_runtime)
if [[ "$RUNTIME" == "none" ]]; then
    echo "Error: Neither docker nor podman found. Please install one."
    exit 1
fi

# Determine platforms to build
if [[ -n "$PLATFORM_OVERRIDE" ]]; then
    BUILD_PLATFORMS="$PLATFORM_OVERRIDE"
elif [[ "$MULTIARCH" == true ]]; then
    BUILD_PLATFORMS="$PLATFORMS"
else
    BUILD_PLATFORMS=""
fi

# Full image reference
FULL_IMAGE="$REGISTRY/$IMAGE_NAME:$IMAGE_TAG"

echo "=============================================="
echo "SDR Cockpit Production Build"
echo "=============================================="
echo ""
echo "Runtime:    $RUNTIME"
echo "Image:      $IMAGE_NAME:$IMAGE_TAG"
echo "Registry:   $REGISTRY"
echo "Full ref:   $FULL_IMAGE"
echo "Multi-arch: $MULTIARCH"
if [[ -n "$BUILD_PLATFORMS" ]]; then
    echo "Platforms:  $BUILD_PLATFORMS"
fi
echo "Push:       $PUSH"
echo ""

cd "$PROJECT_ROOT"

# Convert platform string to array
IFS=',' read -ra PLATFORM_ARRAY <<< "$BUILD_PLATFORMS"

# Get architecture suffix from platform (e.g., linux/amd64 -> amd64)
get_arch_suffix() {
    local platform="$1"
    echo "${platform##*/}"
}

# Build single-architecture image
build_single_arch() {
    local platform="$1"
    local tag="$2"

    echo "Building for platform: ${platform:-native}..."

    local build_args=(
        build
        -f docker/sdr-cockpit.Dockerfile
        -t "$tag"
    )

    if [[ -n "$platform" ]]; then
        build_args+=(--platform "$platform")
    fi

    build_args+=(.)

    $RUNTIME "${build_args[@]}"
}

# Build and push multi-arch manifest (works with both Docker and Podman)
build_multi_arch() {
    echo "Building multi-architecture image..."
    echo "   Platforms: $BUILD_PLATFORMS"
    echo ""

    local arch_tags=()

    # Build each architecture separately
    for platform in "${PLATFORM_ARRAY[@]}"; do
        local arch_suffix
        arch_suffix=$(get_arch_suffix "$platform")
        local arch_tag="$FULL_IMAGE-$arch_suffix"

        echo ""
        echo ">>> Building $platform..."
        build_single_arch "$platform" "$arch_tag"

        echo ">>> Pushing $arch_tag..."
        $RUNTIME push "$arch_tag"

        arch_tags+=("$arch_tag")
    done

    echo ""
    echo ">>> Creating manifest: $FULL_IMAGE"

    # Remove existing manifest if present (ignore errors)
    $RUNTIME manifest rm "$FULL_IMAGE" 2>/dev/null || true

    # Create new manifest
    $RUNTIME manifest create "$FULL_IMAGE"

    # Add each architecture to manifest
    for arch_tag in "${arch_tags[@]}"; do
        echo ">>> Adding $arch_tag to manifest..."
        $RUNTIME manifest add "$FULL_IMAGE" "docker://$arch_tag"
    done

    # Push the manifest
    echo ""
    echo ">>> Pushing manifest: $FULL_IMAGE"
    $RUNTIME manifest push "$FULL_IMAGE" "docker://$FULL_IMAGE"

    echo ""
    echo "Manifest created and pushed for platforms: $BUILD_PLATFORMS"
}

# Build single-arch image (possibly with platform override)
build_single() {
    local platform=""
    if [[ ${#PLATFORM_ARRAY[@]} -eq 1 ]]; then
        platform="${PLATFORM_ARRAY[0]}"
    elif [[ ${#PLATFORM_ARRAY[@]} -gt 1 ]]; then
        echo "Error: Multiple platforms specified without --multiarch flag"
        exit 1
    fi

    build_single_arch "$platform" "$IMAGE_NAME:$IMAGE_TAG"

    # Also tag with full registry path
    $RUNTIME tag "$IMAGE_NAME:$IMAGE_TAG" "$FULL_IMAGE"

    if [[ "$PUSH" == true ]]; then
        echo ""
        echo ">>> Pushing $FULL_IMAGE..."
        $RUNTIME push "$FULL_IMAGE"
    fi
}

# Main build logic
if [[ "$MULTIARCH" == true ]]; then
    build_multi_arch
else
    build_single
fi

echo ""
echo "=============================================="
echo "Build complete!"
echo "=============================================="
echo ""

if [[ "$PUSH" == true ]]; then
    echo "Image pushed to: $FULL_IMAGE"
    if [[ "$MULTIARCH" == true ]]; then
        echo ""
        echo "Manifest includes:"
        for plat in "${PLATFORM_ARRAY[@]}"; do
            echo "  - $plat"
        done
    fi
else
    echo "Image built locally:"
    echo "  - $IMAGE_NAME:$IMAGE_TAG"
    echo "  - $FULL_IMAGE"
    echo ""
    echo "To run locally:"
    echo "  $RUNTIME run -p 8000:8000 $IMAGE_NAME:$IMAGE_TAG"
    echo ""
    echo "To push to registry:"
    echo "  $0 --push"
fi
echo ""
