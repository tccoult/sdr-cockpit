# SDR Cockpit Scripts

Utility scripts for development, building, and deployment.

## Development

**`dev.sh`** - Start development environment

Runs frontend dev server (with hot reload) and backend API concurrently.
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

**`deploy-systemd.sh`** - Deploy as systemd service

Sets up SDR Cockpit as a systemd service on Alma Linux. This script:
- Creates a dedicated `sdr` user
- Installs Redis and Podman if needed
- Installs the systemd service
- Configures auto-start and auto-restart

```bash
sudo ./scripts/deploy-systemd.sh
```

**`sdr-cockpit.service`** - systemd service definition

The systemd unit file that defines how the service runs:
- Auto-pulls latest image on start
- Runs with security hardening
- Depends on Redis
- Automatically restarts on failure

After deployment, manage with systemctl:
```bash
sudo systemctl start sdr-cockpit
sudo systemctl stop sdr-cockpit
sudo systemctl status sdr-cockpit
sudo journalctl -u sdr-cockpit -f  # View logs
```
