# SDR Cockpit Architecture

This document describes how data flows through the system and where to find key components.

## Data Flow

```
User Action → REST API → Task/Source → Simulator → WebSocket → Visualization
```

### 1. Task Creation

User creates an RX task via the frontend wizard.

```
Frontend                          Backend
────────                          ───────
CreateRxDialog.tsx               POST /api/tasks/
       ↓                              ↓
   api.createRxTask()           tasks.py:create_task()
                                      ↓
                              Creates Task + DataSource
                                      ↓
                              Registers with SourceManager
```

**Key Files:**
- `frontend/src/components/tasks/CreateRxDialog.tsx` - Task creation UI
- `backend/app/api/routes/tasks.py` - Task CRUD endpoints
- `backend/app/sources/manager.py` - Global source registry

### 2. Source Registration

Each task creates a data source that generates spectral data.

```python
# backend/app/sources/manager.py
source_manager.register(source)  # Makes source available for subscription
```

Sources are lazy - they only generate data when clients subscribe.

**Key Files:**
- `backend/app/sources/base.py` - DataSource base class
- `backend/app/sources/spectral.py` - Spectral data source (FFT generation)

### 3. Client Subscription

Frontend subscribes to a source via WebSocket.

```
Frontend                              Backend
────────                              ───────
useSourceStream.ts                 websocket.py
       ↓                                ↓
createSourceDataStream()         @router.websocket("/ws/sources/{id}/data")
       ↓                                ↓
   WebSocket connect              source_manager.subscribe_client()
       ↓                                ↓
   Receive binary frames          client_queue.put(data)
```

**Key Files:**
- `frontend/src/hooks/useSourceStream.ts` - Stream connection hook
- `frontend/src/api/sourceWebsocket.ts` - WebSocket client
- `backend/app/api/websocket.py` - WebSocket server endpoint

### 4. Data Generation

The simulator generates mock FFT data at 60 FPS.

```python
# backend/app/sources/spectral.py
async def _generate_loop(self):
    while self.is_attached:
        fft_data = generate_fft_frame(...)
        compressed = zstd.compress(protobuf_encode(fft_data))
        await self._publish(compressed)
        await asyncio.sleep(1/60)
```

Data is:
1. Generated as FFT bins (numpy array)
2. Encoded as Protocol Buffers
3. Compressed with Zstandard
4. Published to all subscribed client queues

**Key Files:**
- `backend/app/sources/spectral.py` - FFT data generation
- `simulator/src/simulator/generator.py` - Signal generation algorithms

### 5. Data Decoding

Frontend decodes and renders the data.

```
WebSocket frame (binary)
       ↓
zstd.decompress()
       ↓
protobuf.decode() → FFTFrame[]
       ↓
dispatchFFTData() → window event
       ↓
FFTDisplay.tsx listens and renders
```

**Key Files:**
- `frontend/src/api/sourceWebsocket.ts` - Decompression/decoding
- `frontend/src/utils/fftEventBus.ts` - Event dispatch
- `frontend/src/components/visualization/FFTDisplay.tsx` - Rendering

### 6. Visualization

FFTDisplay renders the spectrum using WebGL.

```typescript
// frontend/src/components/visualization/FFTDisplay.tsx
const handleFFTData = (event: CustomEvent<FFTDataBatch>) => {
  const frame = event.detail.frames[frames.length - 1];

  // Apply smoothing
  smoothed[i] = smoothed[i] * FACTOR + bins[i] * (1 - FACTOR);

  // Update plot
  trace.setXY(frequencies, powers);
  plot.requestDraw();
};
```

**Key Files:**
- `frontend/src/components/visualization/FFTDisplay.tsx` - FFT line plot
- `frontend/src/components/visualization/WaterfallDisplay.tsx` - Waterfall view
- `frontend/src/components/visualization/SpectrogramDisplay.tsx` - Combined view
- `frontend/src/plot/` - WebGL plotting engine

## Key Design Decisions

### Source-Based Streaming
Tasks create sources. Clients subscribe to sources, not tasks directly. This allows:
- Multiple clients viewing the same data
- Lazy activation (no data generated without subscribers)
- Future support for non-task sources

### Protobuf + Zstandard
Binary protocol for performance:
- Protobuf: Compact serialization (~10x smaller than JSON)
- Zstandard: Fast compression (~3x reduction)

Schema: `frontend/src/proto/spectral_data.proto`

### Event Bus Pattern
FFT data dispatched via window events, not React props:
- Decouples WebSocket from visualization
- Multiple components can subscribe
- Avoids React re-render overhead

See: `frontend/src/utils/fftEventBus.ts`

### OpenAPI-First
Types generated from `api/openapi.yaml`:
- `frontend/src/types/generated/api.ts` - TypeScript
- `backend/app/models/generated.py` - Pydantic

Regenerate with: `./scripts/generate-types.sh`

## Directory Structure

```
sdr-cockpit/
├── frontend/src/
│   ├── api/              # API clients (REST + WebSocket)
│   ├── components/       # React components
│   │   ├── tasks/        # Task management UI
│   │   └── visualization/ # FFT, waterfall, spectrogram
│   ├── hooks/            # React hooks (data fetching, streaming)
│   ├── plot/             # WebGL plotting engine
│   └── types/            # TypeScript types (generated + manual)
│
├── backend/app/
│   ├── api/routes/       # REST endpoints
│   ├── api/websocket.py  # WebSocket streaming
│   ├── sources/          # Data source management
│   └── models/           # Pydantic models (generated)
│
├── simulator/            # Mock SDR data generator
└── api/                  # OpenAPI specification (source of truth)
```

## Common Tasks

### Add a new API endpoint

1. Define in `api/openapi.yaml`
2. Run `./scripts/generate-types.sh`
3. Implement in `backend/app/api/routes/`
4. Add frontend method in `frontend/src/services/api/ApiService.ts`

### Add a visualization component

1. Create component in `frontend/src/components/visualization/`
2. Subscribe to FFT events: `window.addEventListener('fft-data', handler)`
3. Use plot engine from `frontend/src/plot/`

### Modify data generation

1. Edit `backend/app/sources/spectral.py` for FFT parameters
2. Edit `simulator/src/simulator/generator.py` for signal types

## Testing

```bash
./scripts/test.sh      # Run all tests
./scripts/check.sh     # Full CI checks (lint, type-check, test, build)
```

Key test files:
- `frontend/src/__tests__/smoke.test.ts` - Critical user flows
- `backend/tests/test_integration.py` - API lifecycle tests
- `simulator/tests/test_simulator.py` - Data generation tests
