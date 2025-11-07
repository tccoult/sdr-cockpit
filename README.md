# SDR Cockpit

A modern web application for controlling and monitoring Software Defined Radio (SDR) systems with real-time visualizations and multi-user support.

![SDR Cockpit](docs/images/sdr_cockpit.png)

## Overview

SDR Cockpit provides an intuitive interface for tasking SDR hardware, visualizing RF data in real-time, and managing multiple simultaneous receive/transmit operations. Built for both interactive exploration and programmatic control of SDR systems.

## Key Features

- **Real-time Visualizations**: Spectrograms, waterfalls, and signal detections
- **Multi-tasking Support**: Handle multiple simultaneous receive tasks
- **Task Attachment**: Connect to existing data streams
- **SigMF Integration**: Record and playback using the Signal Metadata Format standard
- **Transmit Capability**: Upload and transmit SigMF files
- **Multi-user Support**: Collaborative SDR operations
- **Modern UI**: Clean, responsive React-based interface

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Python 3.11 + FastAPI
- **Simulator**: Python 3.11 + NumPy (mock SDR data generator)
- **Development**: VSCode Dev Container (Alma Linux 9)
- **Deployment**: Docker container + systemd service

## Getting Started

### Development

**Quick start:**

```bash
./scripts/setup.sh    # Install dependencies (first time only)
./scripts/dev.sh      # Start dev environment
```

This starts the frontend (http://localhost:5173) and backend (http://localhost:8000) with hot reload.

**Run tests:**

```bash
./scripts/test.sh     # Run all test suites
./scripts/check.sh    # Run full CI checks (lint, type-check, test, build)
```

### Production

**Build and deploy:**

```bash
./scripts/build-prod.sh        # Build container
./scripts/run-prod-local.sh    # Test locally
sudo ./scripts/deploy-systemd.sh  # Deploy as systemd service
```

For air-gapped deployments, use `./scripts/build-rpm.sh` to create a bundled RPM package.

## Project Structure

```
sdr-cockpit/
├── frontend/          # React + TypeScript + Vite
├── backend/           # FastAPI server
├── simulator/         # Mock SDR data generator
├── docker/            # Container definitions
├── scripts/           # Development and deployment scripts
└── .devcontainer/     # VSCode dev container
```

## Contributing

This is currently a personal project, but contributions and suggestions are welcome!

## License

TBD

---

**Status**: 🚧 Active Development
