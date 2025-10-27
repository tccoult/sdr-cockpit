# SDR Cockpit

A modern web application for controlling and monitoring Software Defined Radio (SDR) systems with real-time visualizations and multi-user support.

## Overview

SDR Cockpit provides a sleek, intuitive interface for tasking SDR hardware, visualizing RF data in real-time, and managing multiple simultaneous receive/transmit operations. Inspired by OpenWebRx, this tool is designed for both interactive exploration and programmatic control of SDR systems.

## Key Features

### Current Goals (v0.1)
- **Real-time Visualizations**: Spectrograms, waterfalls, and signal detections
- **Multi-tasking Support**: Handle multiple simultaneous receive tasks
- **Task Attachment**: Connect to existing data streams, even those not created by the web app
- **SigMF Integration**: Record and playback using the Signal Metadata Format standard
- **Transmit Capability**: Upload and transmit SigMF files with frequency override
- **Multi-user Support**: Collaborative SDR operations
- **Modern UI**: Clean, responsive React-based interface

### Future Enhancements
- Health monitoring and telemetry (potential Prometheus integration)
- Advanced signal processing and analysis
- Task scheduling and automation
- Recording management and library

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Python 3.11 + FastAPI (serves both API and built frontend)
- **Simulator**: Python 3.11 + NumPy (mock SDR data generator)
- **Development**: VSCode Dev Container (Alma Linux 9)
- **Deployment**: Single Docker container + systemd service

## Project Structure

```
sdr-cockpit/
├── frontend/          # React + TypeScript + Vite
├── backend/           # FastAPI server (serves API + built frontend)
├── simulator/         # Mock SDR data generator
├── docker/            # Container definitions
├── scripts/           # Development and deployment scripts
├── .github/workflows/ # CI/CD pipelines
└── .devcontainer/     # VSCode dev container
```

## Getting Started

### Prerequisites
- **Docker and VSCode** with Remote-Containers extension (recommended)
- OR **Node.js 20+** and **Python 3.11+** for local development

### Quick Start (Dev Container)
1. Open this folder in VSCode
2. Click "Reopen in Container" when prompted
3. Wait for container to build (first time only)
4. You now have a full Alma Linux 9 environment with Node 20 + Python 3.11

### Development

Use the provided script for a smooth development experience:

```bash
./scripts/dev.sh
```

This starts both the frontend dev server (with hot reload) and the backend API:
- Frontend: http://localhost:5173
- Backend: http://localhost:8000

Or run services manually:

```bash
# Frontend (in one terminal)
cd frontend && npm install && npm run dev

# Backend (in another terminal)
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload
```

### Production

**Build and test:**
```bash
./scripts/build-prod.sh        # Build container
./scripts/run-prod-local.sh    # Test locally at http://localhost:8000
```

**Deploy (Internet-connected):**
```bash
sudo ./scripts/deploy-systemd.sh
sudo systemctl start sdr-cockpit
# Pulls latest image from registry and starts service
```

**Deploy (Air-gapped):**
```bash
./scripts/build-rpm.sh         # Build RPM with bundled container
# Transfer .rpm to target system
sudo dnf install sdr-cockpit-*.rpm
sudo systemctl start sdr-cockpit
```

Both deployment methods:
- Automatically restart on failure
- Integrate with systemd logging
- Require podman and redis

## Development & Testing

### Running Tests

#### Frontend Tests
```bash
cd frontend
npm test              # Run all tests
npm run type-check    # TypeScript validation
npm run lint          # ESLint (warnings only)
npm run build         # Production build
```

#### Backend Tests
```bash
cd backend
python -m pytest -v   # Run all tests
mypy app/             # Type checking
ruff check .          # Linting (warnings only)
black --check .       # Format checking (warnings only)
```

#### Simulator Tests
```bash
cd simulator
python -m pytest -v   # Run all tests
```

**Important:** Always use `python -m pytest` (not just `pytest`) to ensure proper import resolution.

### Pre-Commit Checklist

Before committing changes, run tests for the components you modified:

- **Frontend changes**: `npm test && npm run type-check && npm run build`
- **Backend changes**: `python -m pytest -v && mypy app/`
- **Simulator changes**: `python -m pytest -v`
- **Docker changes**: Test affected image builds

### CI/CD Pipeline

GitHub Actions automatically runs on every PR and merge:

1. **PR Checks** (`pr-checks.yml`)
   - Lint, type-check, test all components
   - Build Docker images
   - All checks must pass to merge

2. **Integration Tests** (`integration-tests.yml`)
   - Start full stack with docker-compose
   - Verify all services are healthy
   - Check frontend and backend endpoints

3. **CI/CD on Trunk** (`ci.yml`)
   - Run all checks + integration tests
   - Build and publish Docker images to `ghcr.io`
   - Tagged with commit SHA and `latest`

4. **Manual Workflow** (`manual-ci.yml`)
   - Trigger manually from any branch
   - Optionally publish images to registry

## Documentation

- **[DESIGN.md](./DESIGN.md)** - Architecture, design decisions, and requirements
- **[TECHNICAL_NOTES.md](./TECHNICAL_NOTES.md)** - Implementation details, protocols, and technical deep-dives
- **[ROADMAP.md](./ROADMAP.md)** - Phased development plan and milestones

### Doc Purpose Guide

- **DESIGN.md**: *What* we're building and *why* (architecture, requirements, decisions)
- **TECHNICAL_NOTES.md**: *How* we're building it (protocols, algorithms, data formats)
- **ROADMAP.md**: *When* we're building it (phases, priorities, timeline)

## Development Principles

- **Start Simple**: Build incrementally with clean abstractions
- **Maintainability**: Clear code structure, well-documented
- **Separation of Concerns**: Modular architecture with single responsibility
- **Type Safety**: TypeScript frontend, Python type hints
- **Real-time First**: Design for low-latency streaming data
- **Test Before Merge**: All tests must pass in CI

## Contributing

This is currently a personal project, but contributions and suggestions are welcome!

## License

TBD

---

**Status**: 🚧 Phase 1 - CI/CD Infrastructure Complete

**Last Updated**: 2025-10-26
