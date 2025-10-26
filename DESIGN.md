# SDR Cockpit - Design Document

## Vision

Create a modern, intuitive web application for controlling and monitoring custom SDR hardware with real-time visualizations, multi-user support, and seamless integration with existing SDR workflows.

## Requirements

### Functional Requirements

#### 1. SDR Control & Tasking
- **Task Creation**: Create new receive/transmit tasks with configurable parameters
  - Center frequency, sample rate, bandwidth, gain settings
  - Signal processing pipeline configuration
- **Task Management**: List, monitor, pause, resume, and terminate tasks
- **Multi-task Support**: Handle multiple simultaneous receive tasks
- **Task Attachment**: Connect to data streams from tasks created outside the web app

#### 2. Real-time Visualization
- **Spectrogram Display**: Time-frequency representation of signals
- **Waterfall Display**: Scrolling spectrogram with color-mapped intensity
- **Signal Detections**: Overlay detection markers and metadata
- **FFT Display**: Real-time frequency domain view
- **Hardware-accelerated FFT Support**: Leverage SDR's hardware FFT capabilities

#### 3. Data Recording & Playback
- **SigMF Recording**: Record I/Q data with metadata in SigMF format
  - Automatic metadata capture (frequency, sample rate, timestamp)
  - User-defined annotations and tags
- **SigMF Playback**: Upload and transmit SigMF files
  - Frequency override capability
  - Playback visualization (waterfall of TX data)
  - Playback controls (play, pause, seek, loop)

#### 4. Multi-user Support
- **User Authentication**: Secure login and session management
- **Concurrent Access**: Multiple users viewing/controlling the SDR
- **Permission System**: Read-only vs. control permissions
- **Activity Logging**: Track who did what and when

#### 5. System Monitoring
- **Basic Health Metrics**: Temperature, CPU, memory, buffer status
- **Task Status**: Active tasks, resource utilization
- **Error Reporting**: Clear feedback on failures and issues

### Non-Functional Requirements

#### Performance
- **Low Latency**: < 100ms for control commands
- **Real-time Streaming**: 10+ FPS for spectrograms/waterfalls
- **Efficient Data Transfer**: Compressed/decimated data for visualization
- **Scalable**: Support 5-10 concurrent users without degradation

#### Usability
- **Modern UI**: Clean, responsive, mobile-friendly interface
- **Intuitive**: Minimal learning curve for basic operations
- **Accessible**: Keyboard shortcuts, screen reader support

#### Reliability
- **Graceful Degradation**: Handle SDR disconnects, network issues
- **Error Recovery**: Auto-reconnect, resume streaming
- **Data Integrity**: Ensure complete, accurate SigMF files

#### Maintainability
- **Simple Code**: Clear structure, well-commented
- **Modular Design**: Separate concerns, reusable components
- **Type Safety**: TypeScript frontend, Python type hints
- **Testing**: Unit tests for core functionality

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser(s)                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            React Frontend (Vite)                    │   │
│  │  - UI Components (spectrograms, controls)           │   │
│  │  - WebSocket client (real-time data)                │   │
│  │  - REST client (control API)                        │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP/WebSocket (Binary frames)
                        │
┌───────────────────────▼─────────────────────────────────────┐
│        FastAPI Backend (Python) - runs on SDR SBC           │
│  ┌────────────────────────────────────────────────────┐    │
│  │  REST API (task control, config, file upload)      │    │
│  │  WebSocket API (real-time FFT/spectrogram data)    │    │
│  │  - Multi-threaded queue pattern                    │    │
│  │  - ADPCM compression for FFT data                   │    │
│  │  SigMF file handling (local filesystem)            │    │
│  └────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────┐    │
│  │  SDR Integration Layer                             │    │
│  │  - ZMQ client (protobuf commands)                  │    │
│  │  - Redis subscriber (protobuf data products)       │    │
│  │  - POSIX shared memory reader                      │    │
│  └────────────────────────────────────────────────────┘    │
└───────────────────────┬─────────────────────────────────────┘
                        │ ZMQ (commands)
                        │ Redis Pub/Sub + Shared Memory (data)
                        │
┌───────────────────────▼─────────────────────────────────────┐
│        Existing SDR Control Software (on SBC)               │
│  ┌────────────────────────────────────────────────────┐    │
│  │  - ZMQ server (receives task commands)             │    │
│  │  - Task manager (create/destroy RX/TX tasks)       │    │
│  │  - Redis publisher (publishes FFT/IQ data)         │    │
│  │  - Shared memory manager (POSIX shm)               │    │
│  └────────────────────────────────────────────────────┘    │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                   SDR Hardware (RHEL9 SBC)                  │
│  - RF Frontend (RX/TX)                                      │
│  - Hardware-accelerated FFT (up to 8K, configurable)        │
│  - Rational resampling (arbitrary sample rates)             │
│  - Multiple simultaneous RX tasks                           │
└─────────────────────────────────────────────────────────────┘
```

**Key Architecture Notes:**
- Backend runs on the same SBC as SDR control software (localhost communication)
- Redis pub/sub carries metadata + POSIX shared memory handles (protobuf)
- Backend reads FFT data directly from shared memory for zero-copy efficiency
- One Redis channel per RX task (backend subscribes based on task ID)
- ZMQ for command/control (create/destroy tasks)
- WebSocket for browser communication (ADPCM-compressed FFT)

### Component Design

#### Frontend Components
```
frontend/
├── src/
│   ├── components/
│   │   ├── visualization/
│   │   │   ├── Spectrogram.tsx      # Time-frequency display
│   │   │   ├── Waterfall.tsx        # Scrolling waterfall
│   │   │   ├── FFTDisplay.tsx       # Frequency domain plot
│   │   │   └── DetectionOverlay.tsx # Signal detection markers
│   │   ├── controls/
│   │   │   ├── TaskPanel.tsx        # Task list and controls
│   │   │   ├── FrequencyControl.tsx # Tuning controls
│   │   │   ├── RecordingPanel.tsx   # Record/playback UI
│   │   │   └── TransmitPanel.tsx    # TX file upload & control
│   │   ├── layout/
│   │   │   ├── Dashboard.tsx        # Main application layout
│   │   │   └── Sidebar.tsx          # Navigation and settings
│   │   └── common/
│   │       ├── Button.tsx
│   │       └── Input.tsx
│   ├── services/
│   │   ├── api.ts                   # REST API client
│   │   ├── websocket.ts             # WebSocket client
│   │   └── auth.ts                  # Authentication
│   ├── hooks/
│   │   ├── useSDRData.ts            # Real-time data hook
│   │   └── useTasks.ts              # Task management hook
│   ├── types/
│   │   └── sdr.ts                   # TypeScript definitions
│   └── utils/
│       ├── fft.ts                   # FFT processing utilities
│       └── colormap.ts              # Spectrogram color mapping
```

#### Backend Components
```
backend/
├── app/
│   ├── main.py                      # FastAPI application entry
│   ├── api/
│   │   ├── routes/
│   │   │   ├── tasks.py             # Task CRUD endpoints
│   │   │   ├── recordings.py       # SigMF file management
│   │   │   ├── transmit.py         # TX control endpoints
│   │   │   └── system.py            # Health/status endpoints
│   │   └── websocket/
│   │       └── streaming.py         # Real-time data streaming
│   ├── services/
│   │   ├── sdr_control.py           # SDR abstraction layer
│   │   ├── task_manager.py          # Task lifecycle management
│   │   ├── data_streamer.py         # FFT/spectrogram streaming
│   │   └── sigmf_handler.py         # SigMF read/write
│   ├── models/
│   │   ├── task.py                  # Task data models
│   │   ├── recording.py             # Recording metadata
│   │   └── user.py                  # User/auth models
│   └── core/
│       ├── config.py                # Configuration management
│       ├── auth.py                  # Authentication/authorization
│       └── database.py              # Database connection (if needed)
```

### Data Flow

#### Real-time Visualization
1. SDR hardware generates FFT data (hardware-accelerated)
2. Backend reads FFT data from SDR task stream
3. Backend decimates/compresses data for web transmission
4. Backend streams via WebSocket to connected clients
5. Frontend renders spectrogram/waterfall in real-time

#### Task Control
1. User creates task via frontend UI
2. Frontend sends REST API request to backend
3. Backend validates request and calls SDR control API
4. SDR creates task and returns task ID
5. Backend stores task metadata and returns to frontend
6. Frontend subscribes to task data stream via WebSocket

#### SigMF Recording
1. User starts recording for a task
2. Backend opens SigMF file writer with metadata
3. Backend streams I/Q samples from task to file
4. User stops recording
5. Backend finalizes SigMF file and metadata
6. File available for download or playback

#### SigMF Playback
1. User uploads SigMF file via frontend
2. Backend validates file and parses metadata
3. User configures TX parameters (frequency override, etc.)
4. Backend creates TX task and streams file to SDR
5. Backend simultaneously streams FFT of TX data to frontend
6. Frontend displays TX waterfall in real-time

## Technology Choices

### Frontend
- **React**: Industry standard, excellent ecosystem
- **Vite**: Fast development, modern build tool
- **TypeScript**: Type safety and better DX
- **Canvas/WebGL**: For high-performance visualizations
- **TanStack Query**: Server state management (optional)
- **Zustand/Jotai**: Client state management (lightweight)

### Backend
- **FastAPI**: Fast, modern, async Python framework
- **WebSockets**: Real-time bidirectional communication (binary frames)
- **Pydantic**: Data validation and serialization
- **PyZMQ**: ZeroMQ client for SDR control commands
- **Redis-py**: Redis client for pub/sub data streams
- **Protobuf**: Message serialization (matches existing SDR software)
- **NumPy**: FFT data processing and manipulation
- **POSIX Shared Memory**: Zero-copy access to FFT/IQ data (via mmap/shm_open)
- **SigMF**: Standard metadata format for RF recordings

### Development
- **VSCode Dev Container**: Consistent development environment
- **Alma Linux 9**: Matches production RHEL9 SBC environment
- **Docker Compose**: Multi-container orchestration (frontend + backend + Redis for dev)
- **ESLint/Prettier**: Frontend code quality
- **Black/Ruff**: Python code quality

### Optional/Future
- **PostgreSQL**: User/session metadata (if auth is added)
- **Nginx**: Reverse proxy for production
- **Prometheus**: Advanced telemetry export (alternative to basic health metrics)

## Key Design Decisions

### Decision 1: Monorepo vs. Multi-repo
**Choice**: Monorepo (frontend + backend in same repo)
**Rationale**:
- Shared type definitions and documentation
- Atomic changes across frontend/backend
- Simpler initial setup for single developer
- Can split later if needed

### Decision 2: WebSocket vs. Server-Sent Events
**Choice**: WebSocket
**Rationale**:
- Bidirectional communication (future interactivity)
- Lower latency for real-time data
- Better support for binary data (compressed FFT)

### Decision 3: SDR Control Protocol
**Choice**: ZMQ + Protobuf for commands, Redis + Shared Memory for data
**Rationale**:
- Matches existing SDR control software architecture
- ZMQ provides reliable, async messaging
- Redis pub/sub for real-time data distribution
- POSIX shared memory for zero-copy FFT/IQ access
- Can add SoapySDR compatibility layer in future

### Decision 4: Visualization Technology
**Choice**: Canvas 2D API (start), WebGL (future optimization)
**Rationale**:
- Canvas sufficient for initial 10+ FPS target
- Easier to implement and debug
- WebGL for 60 FPS or multi-user loads

## Design Decisions (Resolved)

### 1. SDR Hardware Interface ✅
**Decision**: ZMQ + Redis + POSIX Shared Memory
**Details**:
- Commands sent via ZMQ (protobuf messages)
- Data products published via Redis pub/sub (protobuf metadata + shm handles)
- FFT data read from POSIX shared memory (zero-copy, efficient)
- Not SoapySDR compatible (custom solution)
- Future: May add REST API alongside ZMQ for easier web integration
- Future: SoapySDR compatibility as alternative backend API

### 2. Task Persistence ✅
**Decision**: Ephemeral (task state lives in SDR software)
**Details**:
- No database required for task storage
- Tasks created/destroyed via ZMQ commands
- Backend discovers existing tasks by querying SDR control software
- Web app can attach to any active task (even if not created by web app)

### 3. Authentication Requirements ✅
**Decision**: No authentication for Phase 1
**Details**:
- Skip auth initially to simplify development
- Multi-user support in UI, but no access control
- Add authentication in Phase 5+ if needed
- LAN deployment assumption (trusted network)

### 4. Data Streaming Strategy ✅
**Decision**: ADPCM-compressed FFT over binary WebSocket
**Details**:
- FFT sizes: up to 8K (hardware), higher possible in software
- Target frame rate: 30 FPS for display
- Sample rates: variable (arbitrary rational resampling in hardware)
- Network: LAN primary, occasionally WAN
- Compression: ADPCM (inspired by OpenWebRx) reduces bandwidth ~4x
- Data flow: Hardware FFT → Shared Memory → Backend (compress) → WebSocket → Browser

### 5. Recording Storage ✅
**Decision**: Local filesystem on SDR SBC
**Details**:
- SigMF recordings stored in designated directory on SBC
- Backend subscribes to Redis IQ stream and writes to file
- Files available for download via REST API
- Metadata stored in SigMF JSON sidecar files

## Development Roadmap

### Phase 1: Foundation (Current)
- [x] Project structure and documentation
- [ ] Dev container setup
- [ ] Frontend scaffold (React + Vite)
- [ ] Backend scaffold (FastAPI)
- [ ] Basic REST API (health check, stub endpoints)

### Phase 2: Basic Connectivity
- [ ] WebSocket connection (ping/pong)
- [ ] Mock SDR data generator (for development)
- [ ] Simple FFT visualization
- [ ] Basic task list UI

### Phase 3: SDR Integration
- [ ] Real SDR control integration (SoapySDR or custom)
- [ ] Attach to existing task streams
- [ ] Real-time FFT streaming
- [ ] Task create/delete functionality

### Phase 4: Recording & Playback
- [ ] SigMF recording implementation
- [ ] File upload/download
- [ ] TX playback with frequency override
- [ ] TX waterfall visualization

### Phase 5: Multi-user & Polish
- [ ] Authentication system
- [ ] User permissions
- [ ] Activity logging
- [ ] UI/UX improvements

### Phase 6: Advanced Features
- [ ] Advanced signal processing
- [ ] Prometheus telemetry export
- [ ] Task scheduling
- [ ] Recording library management

## Success Metrics

- **Latency**: Control commands execute within 100ms
- **Frame Rate**: Spectrograms update at 10+ FPS
- **Reliability**: 99.9% uptime for streaming during normal operation
- **Usability**: New user can create task and view spectrogram in < 2 minutes
- **Code Quality**: Maintain test coverage > 70% for backend core logic

---

**Document Status**: Living document, updated as design evolves
**Last Updated**: 2025-10-26
