# SDR Cockpit Scripts

Utility scripts for development, building, and deployment.

## Setup & Development

**`setup.sh`** - Install all dependencies

Installs dependencies for frontend, backend, and simulator. Creates virtual environments for Python components.

```bash
./scripts/setup.sh
```

**`test.sh`** - Run all test suites

Runs frontend, backend, and simulator tests. Automatically calls `setup.sh` to ensure dependencies are installed.

```bash
./scripts/test.sh
```

**`dev.sh`** - Start development environment

Runs frontend dev server (with hot reload) and backend API concurrently. Automatically calls `setup.sh` first.
- Frontend: http://localhost:5173
- Backend: http://localhost:8000

```bash
./scripts/dev.sh
```

## Production Build

**`build-prod.sh`** - Build production Docker image

Builds a single container with frontend and backend. Customize with environment variables:
- `IMAGE_NAME` - Image name (default: sdr-cockpit)
- `IMAGE_TAG` - Image tag (default: latest)
- `REGISTRY` - Container registry (default: ghcr.io/tccoult)

```bash
./scripts/build-prod.sh
# or with custom registry
REGISTRY=my-registry.com ./scripts/build-prod.sh
```

**`run-prod-local.sh`** - Test production container locally

Runs the built production image locally for testing before deployment.

```bash
./scripts/run-prod-local.sh
```

## Deployment (Alma Linux)

### Internet-Connected Deployment

**`deploy-systemd.sh`** - Deploy as systemd service

Sets up SDR Cockpit to pull and run from container registry. This script:
- Installs Redis and Podman if needed
- Installs the systemd service
- Auto-pulls latest image on start

```bash
sudo ./scripts/deploy-systemd.sh
sudo systemctl start sdr-cockpit
```

### Air-Gapped Deployment

**`build-rpm.sh`** - Build RPM with bundled container

Creates an RPM package that includes the container image as a tar file.
Perfect for systems without internet access.

```bash
./scripts/build-rpm.sh
# Transfer sdr-cockpit-*.rpm to target system
```

On target system:
```bash
sudo dnf install sdr-cockpit-*.rpm
sudo systemctl start sdr-cockpit
```

The RPM:
- Bundles the container image (no registry pull needed)
- Installs systemd service
- Requires podman and redis

### Managing the Service

After deployment (either method):
```bash
sudo systemctl start sdr-cockpit
sudo systemctl stop sdr-cockpit
sudo systemctl status sdr-cockpit
sudo journalctl -u sdr-cockpit -f  # View logs
```
