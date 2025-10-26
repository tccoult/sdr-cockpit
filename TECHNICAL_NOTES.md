# SDR Cockpit - Technical Implementation Notes

## Purpose

This document captures detailed technical implementation notes, insights from similar projects, and specific design decisions for SDR Cockpit. It complements DESIGN.md with implementation-focused details.

---

## OpenWebRx Analysis

We analyzed [OpenWebRx](https://github.com/jketterl/openwebrx) for architectural inspiration. Key takeaways:

### FFT Data Compression

OpenWebRx uses **ADPCM** (Adaptive Differential Pulse Code Modulation) for compressing FFT data before WebSocket transmission:

```python
# Their pipeline (simplified):
Raw IQ → FFT → LogPower(-70dB) → Optional Averaging →
FftSwap (DC to center) → ADPCM Compression → WebSocket
```

**Compression benefits:**
- ~4:1 compression ratio for FFT data
- For 8K FFT at 30 FPS: 2 MB/s uncompressed → ~500 KB/s compressed
- Critical for multi-user scenarios and WAN connections

**Implementation details:**
- FFT converted to log power (dB scale) first
- ADPCM applied to dB values (better compression on smoother data)
- Binary WebSocket frames (not JSON)

### Multi-threaded Queue Pattern

```python
# Processing thread → Queue → WebSocket sender thread
class Client:
    def __init__(self):
        self.queue = Queue(maxsize=100)  # ~3 seconds at 30 FPS
        threading.Thread(target=self._sender_loop).start()

    def _sender_loop(self):
        while True:
            data = self.queue.get()
            self.websocket.send(data)  # Non-blocking

    def on_fft_data(self, fft):
        try:
            self.queue.put(fft, block=False)
        except Full:
            # Drop frame if client is slow (backpressure)
            pass
```

**Why this pattern:**
- Prevents FFT processing from blocking on slow network/clients
- Queue acts as buffer for network jitter
- Graceful degradation (drops frames vs. blocking)

### Configurable Parameters

OpenWebRx exposes these tunables:
- `fft_size`: 1024, 2048, 4096, 8192 (we support same + higher)
- `fft_fps`: Typical 10-20 FPS (we target 30 FPS)
- `fft_voverlap_factor`: 0.3-0.6 for smooth scrolling waterfalls
- `fft_compression`: "adpcm" or "none"

### Frontend (Limitations)

- Pure JavaScript, no modern framework
- Canvas 2D rendering (no WebGL)
- Fairly dated UI patterns

**Our advantage:** Modern React + TypeScript + potential WebGL

---

## Visualization Architecture

### Goal: Sexy, Modern, Performant UI

#### Primary Display: Scrolling Waterfall

```
┌─────────────────────────────────────────────────┐
│  Frequency Scale (Hz/kHz/MHz labels)            │
├─────────────────────────────────────────────────┤
│                                                 │
│     Waterfall Canvas                            │
│     - Time flows downward                       │
│     - Color-mapped intensity                    │
│     - 60 FPS smooth scrolling                   │
│     - Mouse interactions (zoom, pan, tune)      │
│                                                 │
├─────────────────────────────────────────────────┤
│  FFT Line Plot (current spectrum)               │
│  - Overlaid on waterfall bottom                 │
└─────────────────────────────────────────────────┘
```

#### Rendering Strategy (Phase 1: Canvas 2D)

**Two-layer canvas approach:**

```typescript
// Layer 1: Waterfall (background)
const waterfallCanvas = document.createElement('canvas');
const waterfallCtx = waterfallCanvas.getContext('2d');

// Layer 2: Overlays (foreground - grid, cursor, detections)
const overlayCanvas = document.createElement('canvas');
const overlayCtx = overlayCanvas.getContext('2d');
```

**Waterfall rendering algorithm:**

```typescript
class WaterfallRenderer {
  private imageBuffer: ImageData;  // e.g., 2048w × 2048h
  private colorMap: Uint8ClampedArray;  // 256 colors × 4 (RGBA)

  onFFTData(fftBins: Float32Array) {
    // 1. Shift existing image down by 1 row
    this.shiftImageDown();

    // 2. Map new FFT to top row
    for (let i = 0; i < fftBins.length; i++) {
      const dbValue = fftBins[i];  // -100 to 0 dB typically
      const colorIdx = this.dbToIndex(dbValue);  // 0-255
      const rgba = this.getColor(colorIdx);
      this.setPixel(i, 0, rgba);
    }

    // 3. Request render on next frame
    requestAnimationFrame(() => this.render());
  }

  private shiftImageDown() {
    const data = this.imageBuffer.data;
    const width = this.imageBuffer.width;
    const height = this.imageBuffer.height;

    // Copy rows downward (last row discarded)
    for (let y = height - 1; y > 0; y--) {
      const srcOffset = (y - 1) * width * 4;
      const dstOffset = y * width * 4;
      data.copyWithin(dstOffset, srcOffset, srcOffset + width * 4);
    }
  }

  private render() {
    // Smooth scrolling: interpolate between frames
    const yOffset = this.getScrollInterpolation();
    this.ctx.putImageData(this.imageBuffer, 0, yOffset);
  }
}
```

**Performance optimizations:**
- Use `Uint8ClampedArray` for image data (fast)
- Pre-compute color lookup table (no per-pixel calculations)
- Limit redraw region if possible
- Consider OffscreenCanvas for worker thread rendering

#### Color Maps

Support multiple palettes (inspired by OpenWebRx + matplotlib):

1. **Google Turbo** (default, from OpenWebRx)
   - Vibrant, perceptually uniform
   - Good contrast across full range

2. **Viridis** (scientific)
   - Perceptually uniform
   - Colorblind-friendly

3. **Hot/Jet** (classic)
   - Familiar to SDR users
   - Black → Red → Yellow → White

4. **Monochrome Green** (retro)
   - CRT phosphor aesthetic
   - Low eye strain

**Color map format:**
```typescript
type ColorMap = {
  name: string;
  colors: [number, number, number][];  // RGB tuples
};

// Interpolated to 256 entries at load time
function buildLookupTable(colorMap: ColorMap): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256 * 4);
  for (let i = 0; i < 256; i++) {
    const rgb = interpolateColor(colorMap.colors, i / 255);
    lut[i * 4 + 0] = rgb[0];  // R
    lut[i * 4 + 1] = rgb[1];  // G
    lut[i * 4 + 2] = rgb[2];  // B
    lut[i * 4 + 3] = 255;     // A
  }
  return lut;
}
```

#### Interactive Features

**Mouse interactions:**
- Wheel: Zoom frequency span
- Drag horizontal: Pan frequency
- Drag vertical: Scroll time history (pause live)
- Double-click: Tune to frequency
- Hover: Tooltip with freq/power

**Gesture handling:**
```typescript
canvas.addEventListener('wheel', (e) => {
  const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
  this.frequencySpan *= zoomFactor;
  this.updateFrequencyScale();
});

canvas.addEventListener('mousemove', (e) => {
  const freq = this.pixelToFrequency(e.offsetX);
  const power = this.pixelToPower(e.offsetY);
  this.showTooltip(freq, power);
});
```

#### UI Layout (Modern Design)

**Glass morphism panels:**
```css
.control-panel {
  background: rgba(20, 20, 30, 0.85);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

**Dark theme palette:**
```css
:root {
  --bg-primary: #0a0a0f;
  --bg-secondary: #14141e;
  --bg-tertiary: #1e1e2d;
  --accent-primary: #00e5ff;
  --accent-secondary: #7c4dff;
  --text-primary: #ffffff;
  --text-secondary: #a0a0b0;
}
```

**Layout grid:**
```
┌────────────────────────────────────────────────────┐
│  Header: Logo | Title | Connection Status          │
├────────┬───────────────────────────────────────────┤
│        │                                           │
│  Task  │      Waterfall Display                    │
│  List  │      (maximized, main focus)              │
│        │                                           │
│  (240px│                                           │
│  wide) │                                           │
│        │                                           │
├────────┴───────────────────────────────────────────┤
│  Controls: Frequency | Recording | Transmit        │
└────────────────────────────────────────────────────┘
```

#### Advanced Rendering (Future: Phase 2+)

**WebGL upgrade:**
- Render waterfall as textured quad
- Fragment shader for colormap application
- Compute shader for FFT processing (if WebGPU available)
- Can handle 4K+ waterfalls at 60 FPS

**Shader pseudocode:**
```glsl
// Fragment shader
uniform sampler2D waterfallTexture;
uniform sampler1D colorMap;
varying vec2 texCoord;

void main() {
  float dbValue = texture2D(waterfallTexture, texCoord).r;
  vec3 color = texture1D(colorMap, dbValue).rgb;
  gl_FragColor = vec4(color, 1.0);
}
```

**3D spectrogram (optional, "wow factor"):**
- three.js or raw WebGL
- Time × Frequency × Power as height-mapped surface
- Rotate/pan camera view
- Mostly for demos, less practical

---

## Backend Architecture

### SDR Integration Layer

#### ZMQ Command Interface

**Purpose:** Send control commands to existing SDR software

```python
import zmq
import my_sdr_pb2  # Generated from .proto file

class SDRCommandClient:
    def __init__(self, zmq_endpoint: str = "tcp://localhost:5555"):
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.REQ)  # Request-Reply pattern
        self.socket.connect(zmq_endpoint)

    def create_rx_task(self, freq: float, samp_rate: float,
                       bandwidth: float, fft_size: int) -> str:
        """Create RX task, returns task ID"""
        request = my_sdr_pb2.CreateRxTaskRequest(
            center_freq=freq,
            sample_rate=samp_rate,
            bandwidth=bandwidth,
            fft_size=fft_size
        )

        self.socket.send(request.SerializeToString())
        response_bytes = self.socket.recv()
        response = my_sdr_pb2.CreateRxTaskResponse()
        response.ParseFromString(response_bytes)

        return response.task_id

    def destroy_task(self, task_id: str):
        """Destroy task by ID"""
        request = my_sdr_pb2.DestroyTaskRequest(task_id=task_id)
        self.socket.send(request.SerializeToString())
        self.socket.recv()  # ACK
```

#### Redis Data Subscriber

**Purpose:** Subscribe to FFT/IQ data streams from SDR

```python
import redis
import posix_ipc
import mmap
import numpy as np
import my_sdr_pb2

class SDRDataSubscriber:
    def __init__(self, redis_host: str = "localhost"):
        self.redis = redis.Redis(host=redis_host, decode_responses=False)
        self.pubsub = self.redis.pubsub()
        self.shm_handles = {}  # Cache shared memory handles

    def subscribe_to_task(self, task_id: str, callback):
        """Subscribe to Redis channel for task data"""
        channel = f"sdr:task:{task_id}:fft"
        self.pubsub.subscribe(**{channel: callback})

    def on_message(self, message):
        """Called when Redis message received"""
        # Parse protobuf metadata
        data_product = my_sdr_pb2.FFTDataProduct()
        data_product.ParseFromString(message['data'])

        # Extract metadata
        timestamp = data_product.timestamp
        center_freq = data_product.center_freq
        sample_rate = data_product.sample_rate
        shm_name = data_product.shm_name
        shm_offset = data_product.shm_offset
        shm_size = data_product.shm_size

        # Read FFT data from shared memory
        fft_data = self.read_shared_memory(shm_name, shm_offset, shm_size)

        return {
            'timestamp': timestamp,
            'center_freq': center_freq,
            'sample_rate': sample_rate,
            'fft': fft_data
        }

    def read_shared_memory(self, name: str, offset: int, size: int) -> np.ndarray:
        """Read FFT data from POSIX shared memory"""
        # Open shared memory (cache handle)
        if name not in self.shm_handles:
            shm = posix_ipc.SharedMemory(name)
            mapfile = mmap.mmap(shm.fd, 0)
            self.shm_handles[name] = mapfile

        mapfile = self.shm_handles[name]

        # Read bytes from offset
        mapfile.seek(offset)
        data_bytes = mapfile.read(size)

        # Parse as float32 array (assuming FFT is float32)
        fft_data = np.frombuffer(data_bytes, dtype=np.float32)

        return fft_data
```

#### WebSocket Streaming (Multi-threaded)

**Purpose:** Stream compressed FFT to web clients

```python
from fastapi import WebSocket
from queue import Queue, Full
import threading
import struct

class FFTStreamer:
    def __init__(self):
        self.clients: dict[str, Queue] = {}  # client_id → queue

    async def connect(self, websocket: WebSocket, task_id: str):
        """New client connected"""
        await websocket.accept()

        client_id = id(websocket)
        queue = Queue(maxsize=100)  # ~3 sec buffer at 30 FPS
        self.clients[client_id] = queue

        # Start sender thread for this client
        threading.Thread(
            target=self._sender_loop,
            args=(websocket, queue, client_id)
        ).start()

        # Subscribe to task data
        # (handled elsewhere, calls on_fft_data)

    def on_fft_data(self, task_id: str, fft_data: dict):
        """New FFT data available, broadcast to clients"""
        # Compress FFT using ADPCM
        compressed = self.compress_adpcm(fft_data['fft'])

        # Package as binary message
        message = self.pack_fft_message(
            fft_data['timestamp'],
            fft_data['center_freq'],
            fft_data['sample_rate'],
            compressed
        )

        # Broadcast to all clients watching this task
        for client_id, queue in self.clients.items():
            try:
                queue.put(message, block=False)
            except Full:
                # Client too slow, drop frame
                pass

    def _sender_loop(self, websocket: WebSocket, queue: Queue, client_id: str):
        """Send queued data to client (runs in thread)"""
        try:
            while True:
                message = queue.get()
                asyncio.run(websocket.send_bytes(message))
        except Exception:
            # Client disconnected
            del self.clients[client_id]

    def compress_adpcm(self, fft: np.ndarray) -> bytes:
        """ADPCM compression (simplified, use audioop or custom)"""
        # TODO: Implement ADPCM or use library
        # For now, placeholder
        return fft.tobytes()

    def pack_fft_message(self, timestamp: int, freq: float,
                         rate: float, data: bytes) -> bytes:
        """Pack FFT into binary message format"""
        # Header: timestamp (8 bytes), freq (8), rate (8), size (4)
        header = struct.pack('<QQQi', timestamp, int(freq), int(rate), len(data))
        return header + data
```

---

## Data Flow Summary

### Receive Path (FFT Visualization)

```
1. SDR Hardware: Generate FFT (hardware accelerated)
   ↓
2. SDR Control Software: Publish to Redis
   - Message: Protobuf (metadata + shm handle)
   - Channel: sdr:task:{task_id}:fft
   ↓
3. Backend (Redis Subscriber Thread):
   - Parse protobuf
   - Read FFT from POSIX shared memory
   - Compress with ADPCM
   - Push to WebSocket queue
   ↓
4. Backend (WebSocket Sender Thread):
   - Pop from queue
   - Send binary frame to browser
   ↓
5. Frontend (React + Canvas):
   - Decode ADPCM
   - Render to waterfall
   - 30-60 FPS display
```

### Control Path (Task Creation)

```
1. Frontend: User clicks "Create Task"
   - Fills form: frequency, sample rate, etc.
   ↓
2. Frontend: POST /api/tasks
   - JSON request body
   ↓
3. Backend (FastAPI):
   - Validate request
   - Build protobuf message
   - Send via ZMQ to SDR control
   ↓
4. SDR Control Software:
   - Create RX task
   - Return task ID
   ↓
5. Backend:
   - Store task metadata
   - Return task ID to frontend
   ↓
6. Frontend:
   - Auto-subscribe to task WebSocket
   - Display in task list
```

---

## Development Environment

### Dev Container (Alma Linux 9)

**Why Alma9:**
- Matches production RHEL9 SBC
- Binary compatibility
- Enterprise package availability

**Container includes:**
- Python 3.11+
- Node.js 20+
- Redis server (for local dev)
- ZMQ libraries
- Protobuf compiler

**Directory mounting:**
```yaml
# .devcontainer/docker-compose.yml
volumes:
  - ..:/workspace:cached  # Project root
  - /tmp/.X11-unix:/tmp/.X11-unix  # For GUI apps (optional)
```

### Mock SDR (for development without hardware)

```python
# backend/app/services/mock_sdr.py
class MockSDRGenerator:
    """Generates fake FFT data for development"""

    def __init__(self, center_freq: float, sample_rate: float, fft_size: int):
        self.center_freq = center_freq
        self.sample_rate = sample_rate
        self.fft_size = fft_size
        self.t = 0

    def generate_fft(self) -> np.ndarray:
        """Generate synthetic FFT with some signals"""
        # Base noise floor
        fft = np.random.normal(-80, 5, self.fft_size)

        # Add a few synthetic signals
        self.add_signal(fft, offset=100, strength=-30, width=10)  # Strong signal
        self.add_signal(fft, offset=-200, strength=-50, width=5)  # Weak signal

        # Drift signals slowly over time
        self.t += 0.1

        return fft.astype(np.float32)

    def add_signal(self, fft, offset, strength, width):
        """Add Gaussian signal peak to FFT"""
        center = self.fft_size // 2 + offset
        for i in range(self.fft_size):
            dist = abs(i - center)
            if dist < width * 3:
                fft[i] += strength * np.exp(-0.5 * (dist / width) ** 2)
```

---

## Protobuf Schemas (Placeholder)

**Will be provided by user, these are examples:**

```protobuf
// sdr_commands.proto
syntax = "proto3";

message CreateRxTaskRequest {
  double center_freq = 1;
  double sample_rate = 2;
  double bandwidth = 3;
  int32 fft_size = 4;
}

message CreateRxTaskResponse {
  string task_id = 1;
  bool success = 2;
  string error_message = 3;
}

message DestroyTaskRequest {
  string task_id = 1;
}
```

```protobuf
// sdr_data_products.proto
syntax = "proto3";

message FFTDataProduct {
  int64 timestamp = 1;  // Unix timestamp (ns)
  double center_freq = 2;
  double sample_rate = 3;
  int32 fft_size = 4;

  // Shared memory handle
  string shm_name = 5;
  int32 shm_offset = 6;
  int32 shm_size = 7;
}
```

---

## Performance Targets

### Latency
- Command roundtrip (UI → Backend → SDR → UI): < 100ms
- FFT data path (SDR → Backend → Browser): < 50ms

### Throughput
- FFT update rate: 30 FPS minimum, 60 FPS target
- Support 5-10 concurrent users on same task
- Bandwidth per user (with ADPCM): ~500 KB/s for 8K FFT @ 30 FPS

### Rendering
- Waterfall scroll: 60 FPS (smooth via requestAnimationFrame)
- No dropped frames on modern hardware (2020+ laptop)

---

## Next Steps

See ROADMAP.md for detailed phase-by-phase implementation plan.

---

**Document Status**: Living document, updated as implementation progresses
**Last Updated**: 2025-10-26
