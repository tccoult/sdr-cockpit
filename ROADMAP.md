# SDR Cockpit - Development Roadmap

## Overview

This roadmap outlines the phased development approach for SDR Cockpit. Each phase builds incrementally toward a fully-featured SDR web interface.

**Principles:**
- Start simple, add complexity gradually
- Working end-to-end demo at each phase
- Focus on core functionality before polish
- Mock external dependencies until integration phase

---

## Phase 1: Foundation & Mock Demo

**Goal:** Working end-to-end demo with mocked SDR data


### Tasks

#### 1.1 Development Environment
- [x] Project documentation (README, DESIGN, PROJECT_STRUCTURE)
- [ ] Dev container setup (Alma Linux 9)
  - Python 3.11, Node.js 20, Redis
  - ZMQ and protobuf libraries
  - VSCode extensions (Python, ESLint, etc.)
- [ ] Docker Compose for multi-service development

#### 1.2 Backend Scaffold
- [ ] FastAPI project structure
  - `app/main.py` with basic app setup
  - `app/api/routes/` directory structure
  - `app/services/` directory structure
- [ ] Health check endpoint (`GET /health`)
- [ ] Basic CORS configuration for frontend
- [ ] Logging configuration
- [ ] `requirements.txt` with core dependencies

#### 1.3 Frontend Scaffold
- [ ] React + Vite + TypeScript project
  - `npm create vite@latest frontend -- --template react-ts`
- [ ] Directory structure (components, services, types, utils)
- [ ] ESLint + Prettier configuration
- [ ] Basic routing (React Router)
- [ ] Dark theme CSS foundation

#### 1.4 Mock SDR Data Generator
- [ ] Mock FFT generator in backend
  - Synthetic noise floor
  - 2-3 simulated signals
  - Configurable parameters (freq, sample rate, FFT size)
- [ ] Mock task manager
  - In-memory task list
  - Create/delete operations
  - Task ID generation

#### 1.5 Basic WebSocket Connection
- [ ] Backend WebSocket endpoint (`/ws/fft/{task_id}`)
- [ ] Frontend WebSocket client service
- [ ] Ping/pong keepalive
- [ ] Connection status indicator in UI

#### 1.6 Simple Waterfall Visualization
- [ ] Canvas-based waterfall component
- [ ] Color map implementation (Google Turbo)
- [ ] FFT data → ImageData conversion
- [ ] Scrolling waterfall animation (basic)
- [ ] Frame rate display (debug overlay)

#### 1.7 Basic Task UI
- [ ] Task list panel (sidebar)
- [ ] "Create Task" button (mock form)
- [ ] Task cards with status
- [ ] Select task → connects WebSocket → shows waterfall

### Deliverables

- Working dev container
- Frontend served on `localhost:5173`
- Backend API on `localhost:8000`
- Can create mock task and see animated waterfall
- Smooth 30+ FPS waterfall scrolling

### Success Criteria

- [ ] Developer can run `code .` → "Reopen in Container" → everything works
- [ ] Click "Create Task" → see waterfall update in real-time
- [ ] No visible frame drops on modern hardware
- [ ] Code is clean, documented, and ready for real SDR integration

---

## Phase 2: Enhanced Visualization & Controls

**Goal:** Polished UI with full interaction features


### Tasks

#### 2.1 Interactive Waterfall
- [ ] Mouse wheel zoom (frequency span)
- [ ] Click-drag panning (horizontal and vertical)
- [ ] Frequency scale (dynamic labels)
- [ ] Power scale (dB axis)
- [ ] Hover tooltip (frequency, power, time)

#### 2.2 Frequency Control
- [ ] Frequency input component
  - Text input with validation
  - Increment/decrement buttons
  - Unit selector (Hz, kHz, MHz, GHz)
- [ ] Bandwidth control
- [ ] Sample rate control
- [ ] Apply changes to task (retune)

#### 2.3 FFT Line Plot
- [ ] Current spectrum overlay (line plot)
- [ ] Min/Max/Average hold modes
- [ ] Peak detection and markers
- [ ] Adjustable averaging

#### 2.4 Color Map Selector
- [ ] Multiple color map options
  - Google Turbo (default)
  - Viridis
  - Hot/Jet
  - Monochrome green
- [ ] Color map preview
- [ ] Auto-level controls
- [ ] Manual min/max dB adjustment

#### 2.5 Task Management UI
- [ ] Enhanced task cards
  - Task parameters display
  - Edit task settings
  - Pause/resume (if supported by SDR)
- [ ] Task creation form
  - Frequency presets (ham bands, etc.)
  - Validation and error messages
- [ ] Multi-task view
  - Switch between tasks
  - Picture-in-picture waterfalls (optional)

#### 2.6 System Status Display
- [ ] SDR connection status indicator
- [ ] Backend health status
- [ ] Data rate meter (KB/s)
- [ ] Frame rate meter
- [ ] Task resource usage (if available)

#### 2.7 Responsive Design
- [ ] Mobile-friendly layout
- [ ] Touch gesture support
- [ ] Collapsible sidebar
- [ ] Full-screen waterfall mode

### Deliverables

- Fully interactive waterfall display
- Complete task management UI
- System status monitoring
- Responsive, mobile-friendly interface

### Success Criteria

- [ ] Can zoom/pan waterfall smoothly
- [ ] Frequency control updates task in real-time
- [ ] Multiple color maps work correctly
- [ ] Task creation form is intuitive and validated
- [ ] UI works well on tablet/mobile

---

## Phase 3: SDR Integration

**Goal:** Connect to real SDR hardware via ZMQ/Redis


### Tasks

#### 3.1 Protobuf Integration
- [ ] Add `.proto` files from SDR control software
- [ ] Generate Python protobuf classes
- [ ] Create Python modules for protobuf handling
  - `app/models/sdr_proto.py`

#### 3.2 ZMQ Command Client
- [ ] Implement `SDRCommandClient` service
  - Create RX task
  - Destroy task
  - Query task list (if supported)
- [ ] Error handling and retries
- [ ] Configuration for ZMQ endpoint
- [ ] Integration tests (mock ZMQ server)

#### 3.3 Redis Data Subscriber
- [ ] Implement `SDRDataSubscriber` service
  - Subscribe to task channels
  - Parse protobuf messages
  - Handle Redis connection errors
- [ ] POSIX shared memory reader
  - Open shared memory handles
  - Read FFT data as numpy arrays
  - Handle cleanup on task destroy
- [ ] Threading model for Redis subscriber

#### 3.4 Replace Mock with Real Data
- [ ] Swap mock SDR generator with real Redis subscriber
- [ ] Configuration flag to toggle mock vs. real
- [ ] Update task creation API to call ZMQ
- [ ] Update WebSocket streamer to use real FFT data

#### 3.5 Task Discovery
- [ ] Implement "discover existing tasks" feature
  - Query SDR control for active tasks
  - Populate task list on backend startup
- [ ] Auto-attach to tasks created outside web app

#### 3.6 ADPCM Compression
- [ ] Implement ADPCM compression for FFT data
  - Research Python ADPCM libraries (audioop or custom)
  - Compress before WebSocket send
- [ ] Frontend ADPCM decoder
  - JavaScript ADPCM implementation
  - Decode before rendering

#### 3.7 Performance Tuning
- [ ] Profile backend data pipeline
- [ ] Optimize shared memory reads
- [ ] Benchmark WebSocket throughput
- [ ] Test with multiple concurrent users

### Deliverables

- Backend connects to real SDR via ZMQ/Redis
- Frontend displays real FFT data from hardware
- Can create/destroy tasks via web UI
- Can attach to existing tasks

### Success Criteria

- [ ] Create RX task from UI → appears on SDR
- [ ] Waterfall shows real RF environment
- [ ] Destroying task from UI stops SDR task
- [ ] Can see tasks created by other processes
- [ ] ADPCM compression working (reduced bandwidth)

---

## Phase 4: Recording & Playback (SigMF)

**Goal:** Record IQ data and playback TX files


### Tasks

#### 4.1 SigMF Recording Backend
- [ ] Subscribe to IQ data stream (Redis)
- [ ] Write SigMF data file (`.sigmf-data`)
- [ ] Write SigMF metadata file (`.sigmf-meta`)
  - Capture frequency, sample rate, timestamp
  - Annotations for signal detections (optional)
- [ ] Recording state machine (start/stop/pause)
- [ ] File naming and storage management

#### 4.2 Recording UI
- [ ] Record button in task panel
- [ ] Recording indicator (time, file size)
- [ ] Stop recording button
- [ ] Recording settings
  - File name
  - Annotations
  - Duration limit

#### 4.3 Recording Library
- [ ] List recorded files endpoint
- [ ] Download SigMF file endpoint
- [ ] Delete recording endpoint
- [ ] Recording metadata display
  - Duration, file size, parameters
  - Thumbnail waterfall preview (optional)

#### 4.4 SigMF Playback (Transmit)
- [ ] Upload SigMF file endpoint
- [ ] Parse SigMF metadata
- [ ] Validate file format
- [ ] Create TX task via ZMQ
- [ ] Stream IQ data to SDR
  - Read from `.sigmf-data`
  - Feed to TX buffer
- [ ] Playback controls (play, pause, seek, loop)

#### 4.5 TX Waterfall Visualization
- [ ] Subscribe to TX FFT stream (if available)
- [ ] Display TX waterfall alongside RX
- [ ] Playback progress indicator
- [ ] Frequency override control

#### 4.6 File Management UI
- [ ] Recording library browser
- [ ] Upload TX file dialog
- [ ] Playback controls panel
- [ ] TX waterfall display

### Deliverables

- Record IQ data to SigMF files
- Download recordings
- Upload and playback SigMF files for TX
- Visualize TX while transmitting

### Success Criteria

- [ ] Can record RX task to SigMF file
- [ ] Recording metadata is complete and valid
- [ ] Can download recording and open in other tools
- [ ] Can upload SigMF file and transmit
- [ ] TX waterfall matches file content

---

## Phase 5: Multi-user & Polish

**Goal:** Production-ready with multi-user support


### Tasks

#### 5.1 Authentication (Optional)
- [ ] User registration/login endpoints
- [ ] JWT token generation
- [ ] HTTP-only cookie session management
- [ ] Login/logout UI
- [ ] Password hashing (bcrypt)

#### 5.2 User Permissions
- [ ] Role-based access control (admin, user, viewer)
- [ ] Permission checks on task operations
- [ ] Read-only mode for viewers

#### 5.3 Activity Logging
- [ ] Audit log for user actions
  - Task creation/deletion
  - Recording start/stop
  - TX operations
- [ ] Log viewer UI (admin only)

#### 5.4 Multi-user Coordination
- [ ] Show active users in UI
- [ ] Lock tasks during edit (prevent conflicts)
- [ ] Broadcast task changes to all users
- [ ] Per-user waterfall view settings

#### 5.5 UI/UX Polish
- [ ] Smooth animations and transitions
- [ ] Loading states and skeletons
- [ ] Error messages and notifications
- [ ] Keyboard shortcuts
- [ ] Help/tutorial overlay

#### 5.6 Performance Optimization
- [ ] Frontend bundle size optimization
- [ ] Lazy loading of components
- [ ] Backend query optimization
- [ ] WebSocket backpressure handling
- [ ] Caching strategies

#### 5.7 Documentation
- [ ] User guide
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Deployment guide
- [ ] Troubleshooting guide

### Deliverables

- Multi-user capable system
- Polished, production-ready UI
- Complete documentation

### Success Criteria

- [ ] 5+ users can use system simultaneously
- [ ] No conflicts or race conditions
- [ ] UI is smooth and responsive
- [ ] New users can get started in < 5 minutes
- [ ] Complete API documentation

---

## Phase 6: Advanced Features

**Goal:** Advanced capabilities and optimizations


### Potential Features

#### 6.1 Advanced Signal Processing
- [ ] Demodulation (AM, FM, SSB, etc.)
- [ ] Audio playback of demodulated signals
- [ ] Signal classification/detection
- [ ] Spectrum analyzer mode

#### 6.2 WebGL Rendering
- [ ] Upgrade waterfall to WebGL
- [ ] Shader-based colormap
- [ ] 4K waterfall support
- [ ] 60+ FPS performance

#### 6.3 Prometheus Integration
- [ ] Export SDR health metrics
- [ ] Grafana dashboard templates
- [ ] Alerting rules

#### 6.4 Task Scheduling
- [ ] Scheduled recording jobs
- [ ] Periodic task execution
- [ ] Calendar view

#### 6.5 Recording Management
- [ ] Tag and search recordings
- [ ] Automatic archival/compression
- [ ] Cloud storage integration

#### 6.6 API Enhancements
- [ ] GraphQL API (alternative to REST)
- [ ] gRPC streaming (alternative to WebSocket)
- [ ] Python SDK for automation

#### 6.7 Mobile App
- [ ] React Native mobile app
- [ ] Push notifications
- [ ] Offline mode with local playback

---

## Current Status

**Active Phase:** Phase 1 - Foundation & Mock Demo

**Completed:**
- [x] Project structure and documentation
- [x] Design decisions documented
- [x] Technical architecture defined

**Next Up:**
- [ ] Dev container setup
- [ ] Backend scaffold
- [ ] Frontend scaffold

---

## Dependencies & Risks

### External Dependencies
- SDR control software (ZMQ/Redis API)
- Protobuf schemas (user to provide)
- POSIX shared memory access

### Technical Risks
- **ADPCM compression complexity:** May need to implement from scratch
- **Shared memory performance:** Need to profile on target hardware
- **Multi-user scalability:** May need optimization for 10+ users
- **WebSocket reliability:** Need robust reconnection logic

### Mitigation Strategies
- Start with uncompressed FFT, add ADPCM later
- Mock shared memory for development
- Load testing in Phase 5
- Implement WebSocket reconnection in Phase 1

---

## Long-term Vision (Beyond Phase 6)

- **Plugin system:** Allow custom signal processors
- **Distributed SDR:** Control multiple SDRs from one interface
- **AI/ML integration:** Automatic signal classification
- **Collaborative features:** Shared annotations, chat
- **Educational mode:** Tutorials and interactive lessons
- **Public receiver network:** Share your SDR with the community

---

**Document Status**: Living document, updated as development progresses
**Last Updated**: 2025-10-26
