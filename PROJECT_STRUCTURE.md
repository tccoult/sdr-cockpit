# Project Structure

This document outlines the directory structure and organization of the SDR Cockpit project.

## Overview

```
sdr-cockpit/
├── .devcontainer/              # VSCode dev container configuration
│   ├── devcontainer.json       # Dev container settings
│   ├── Dockerfile              # Dev container image
│   └── docker-compose.yml      # Multi-container setup
├── frontend/                   # React + Vite application
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── assets/             # Images, fonts, etc.
│   │   ├── components/         # React components (organized by feature)
│   │   │   ├── visualization/  # Spectrogram, waterfall, FFT displays
│   │   │   ├── controls/       # Task, frequency, recording controls
│   │   │   ├── layout/         # Dashboard, navigation
│   │   │   └── common/         # Reusable UI components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/           # API clients, WebSocket handling
│   │   ├── stores/             # State management (Zustand/Jotai)
│   │   ├── types/              # TypeScript type definitions
│   │   ├── utils/              # Helper functions, FFT utils, colormaps
│   │   ├── App.tsx             # Root component
│   │   ├── main.tsx            # Entry point
│   │   └── vite-env.d.ts       # Vite type declarations
│   ├── index.html              # HTML entry point
│   ├── package.json            # Node dependencies
│   ├── tsconfig.json           # TypeScript configuration
│   ├── vite.config.ts          # Vite build configuration
│   └── .eslintrc.json          # ESLint rules
├── backend/                    # FastAPI Python server
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/         # REST API endpoints
│   │   │   │   ├── __init__.py
│   │   │   │   ├── tasks.py    # Task management endpoints
│   │   │   │   ├── recordings.py  # SigMF file operations
│   │   │   │   ├── transmit.py    # Transmit control
│   │   │   │   └── system.py      # Health and status
│   │   │   └── websocket/      # WebSocket handlers
│   │   │       ├── __init__.py
│   │   │       └── streaming.py   # Real-time data streaming
│   │   ├── core/               # Core configuration and utilities
│   │   │   ├── __init__.py
│   │   │   ├── config.py       # App configuration
│   │   │   ├── auth.py         # Authentication logic
│   │   │   └── database.py     # Database setup (if needed)
│   │   ├── models/             # Pydantic models / data schemas
│   │   │   ├── __init__.py
│   │   │   ├── task.py         # Task models
│   │   │   ├── recording.py   # Recording models
│   │   │   └── user.py         # User models
│   │   ├── services/           # Business logic
│   │   │   ├── __init__.py
│   │   │   ├── sdr_control.py     # SDR hardware interface
│   │   │   ├── task_manager.py    # Task lifecycle management
│   │   │   ├── data_streamer.py   # FFT data streaming
│   │   │   └── sigmf_handler.py   # SigMF file I/O
│   │   ├── utils/              # Helper utilities
│   │   │   ├── __init__.py
│   │   │   └── logging.py      # Logging configuration
│   │   └── main.py             # FastAPI app entry point
│   ├── tests/                  # Unit and integration tests
│   │   ├── __init__.py
│   │   ├── test_tasks.py
│   │   └── test_sigmf.py
│   ├── requirements.txt        # Python dependencies
│   ├── pyproject.toml          # Python project config (optional)
│   └── pytest.ini              # Pytest configuration
├── shared/                     # Shared resources (docs, schemas)
│   ├── api-spec/               # OpenAPI/AsyncAPI specs (future)
│   ├── schemas/                # Shared data schemas (JSON Schema)
│   └── docs/                   # Additional documentation
├── docs/                       # Project-level documentation
│   ├── api/                    # API documentation
│   ├── guides/                 # User and developer guides
│   └── architecture/           # Architecture diagrams
├── scripts/                    # Helper scripts
│   ├── setup-dev.sh            # Development environment setup
│   ├── run-tests.sh            # Test runner
│   └── generate-types.sh       # Generate TS types from OpenAPI
├── .github/                    # GitHub configuration (if using GitHub)
│   └── workflows/              # CI/CD workflows
├── .gitignore                  # Git ignore rules
├── README.md                   # Project overview (you are here!)
├── DESIGN.md                   # Design document and requirements
├── PROJECT_STRUCTURE.md        # This file
├── LICENSE                     # License file
└── docker-compose.yml          # Production deployment (optional)
```

## Key Principles

### 1. Separation of Concerns
- **Frontend**: Isolated in `frontend/`, owns all UI logic
- **Backend**: Isolated in `backend/`, owns all business logic
- **Shared**: Minimal shared resources, mainly documentation

### 2. Feature-Based Organization
- Frontend components organized by feature area (visualization, controls, layout)
- Backend routes and services organized by domain (tasks, recordings, transmit)

### 3. Scalability
- Easy to add new routes, components, services
- Clear patterns for new features
- Room to grow without major refactoring

### 4. Type Safety
- TypeScript in frontend for compile-time checks
- Pydantic models in backend for runtime validation
- Shared schemas (future) for consistency

## Directory Details

### Frontend Structure

#### `components/`
Organized by feature area:
- **visualization/**: All data visualization components (spectrogram, waterfall, FFT)
- **controls/**: User input components (task controls, frequency tuning, recording)
- **layout/**: Page layout and navigation components
- **common/**: Reusable UI primitives (Button, Input, Modal, etc.)

#### `services/`
External communication:
- **api.ts**: REST API client (axios/fetch wrapper)
- **websocket.ts**: WebSocket client with reconnection logic
- **auth.ts**: Authentication service (login, logout, token management)

#### `hooks/`
Custom React hooks:
- **useSDRData.ts**: Subscribe to real-time SDR data streams
- **useTasks.ts**: Task CRUD operations and state
- **useAuth.ts**: Authentication state and actions

#### `types/`
TypeScript definitions:
- **sdr.ts**: SDR-related types (Task, Recording, FFTData, etc.)
- **api.ts**: API request/response types
- **common.ts**: Shared utility types

#### `utils/`
Pure utility functions:
- **fft.ts**: FFT processing, windowing functions
- **colormap.ts**: Color mapping for spectrograms
- **format.ts**: Frequency formatting (Hz, kHz, MHz, GHz)

### Backend Structure

#### `api/routes/`
REST endpoints:
- **tasks.py**: GET /tasks, POST /tasks, DELETE /tasks/{id}
- **recordings.py**: GET /recordings, POST /recordings/start, POST /recordings/stop
- **transmit.py**: POST /transmit/upload, POST /transmit/start
- **system.py**: GET /health, GET /status

#### `api/websocket/`
WebSocket handlers:
- **streaming.py**: Real-time FFT/spectrogram data streaming

#### `services/`
Business logic (independent of API layer):
- **sdr_control.py**: Abstract interface to SDR hardware
- **task_manager.py**: Task lifecycle, state tracking
- **data_streamer.py**: FFT data acquisition and streaming
- **sigmf_handler.py**: SigMF file reading, writing, validation

#### `models/`
Pydantic models:
- **task.py**: TaskCreate, Task, TaskStatus
- **recording.py**: Recording, RecordingMetadata
- **user.py**: User, UserCreate, UserLogin

#### `core/`
Application core:
- **config.py**: Configuration from environment variables
- **auth.py**: JWT token generation, validation
- **database.py**: Database connection (if needed)

## Development Workflow

### Adding a New Feature

1. **Design**: Document in DESIGN.md if significant
2. **Backend**:
   - Define Pydantic models in `models/`
   - Implement business logic in `services/`
   - Create API routes in `api/routes/`
   - Write tests in `tests/`
3. **Frontend**:
   - Define TypeScript types in `types/`
   - Create components in appropriate `components/` subdirectory
   - Add API calls in `services/`
   - Create hooks if needed in `hooks/`
4. **Integration**: Test end-to-end functionality
5. **Documentation**: Update relevant docs

### Running the Application

```bash
# Dev Container (recommended)
# Open in VSCode, click "Reopen in Container"

# Terminal 1 - Frontend
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173

# Terminal 2 - Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# Backend runs on http://localhost:8000
# API docs at http://localhost:8000/docs
```

## Next Steps

1. Set up dev container (`.devcontainer/`)
2. Initialize frontend scaffold (`npm create vite@latest`)
3. Initialize backend scaffold (create `app/main.py` with basic FastAPI)
4. Create stub endpoints and basic UI
5. Implement first feature: mock data streaming

---

**Last Updated**: 2025-10-26
