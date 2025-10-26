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

### Frontend
- **React** with **Vite** for fast development
- Modern component library (TBD)
- WebSocket for real-time data streaming
- Responsive, mobile-friendly design

### Backend
- **Python** with **FastAPI** for high-performance async API
- WebSocket support for real-time data
- SoapySDR integration (or similar open standard)
- SigMF file handling

### Development Environment
- VSCode Dev Container (Alma Linux 9)
- Docker for containerization
- Hot-reload for both frontend and backend

## Project Structure

See [DESIGN.md](./DESIGN.md) for detailed architecture and design decisions.

```
sdr-cockpit/
├── frontend/          # React + Vite application
├── backend/           # FastAPI Python server
├── shared/            # Shared types, schemas, and documentation
├── .devcontainer/     # VSCode dev container configuration
└── docs/              # Additional documentation
```

## Getting Started

### Prerequisites
- Docker and VSCode with Remote-Containers extension
- OR: Node.js 18+ and Python 3.11+ for local development

### Quick Start (Dev Container)
1. Open this folder in VSCode
2. Click "Reopen in Container" when prompted
3. Terminal 1: `cd frontend && npm run dev`
4. Terminal 2: `cd backend && uvicorn main:app --reload`

## Development Principles

- **Start Simple**: Build incrementally with clean abstractions
- **Maintainability**: Clear code structure, well-documented
- **Separation of Concerns**: Modular architecture with single responsibility
- **Type Safety**: TypeScript frontend, Python type hints
- **Real-time First**: Design for low-latency streaming data

## Contributing

This is currently a personal project, but contributions and suggestions are welcome!

## License

TBD

---

**Status**: 🚧 Initial Development

**Last Updated**: 2025-10-26
