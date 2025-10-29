# SDR Cockpit Plotting Library - API Design

## Overview

A modern React-based plotting library for high-performance, interactive canvas visualizations. Designed for SDR applications but generic enough for any real-time data visualization needs.

**Design Philosophy:**
- React hooks + functional components (no classes)
- Declarative configuration, imperative updates (for performance)
- Composable and extensible
- Performance-first for 30-60 FPS real-time rendering

---

## Core Hook: `usePlot`

The main entry point for creating a plot instance.

### Basic Usage

```typescript
import { usePlot } from '@/utils/plotting';

function MySpectrumPlot() {
  const plot = usePlot({
    axes: {
      x: {
        label: 'Frequency',
        formatter: (val) => formatFrequency(val),
        range: { min: 2.4e9, max: 2.5e9 }
      },
      y: {
        label: 'Power (dBm)',
        formatter: (val) => `${val.toFixed(1)} dBm`,
        range: { min: -100, max: 0 }
      }
    },
    grid: {
      show: true,
      color: 'rgba(255, 255, 255, 0.1)',
      xLines: 10,
      yLines: 8
    },
    interactions: {
      zoom: true,
      pan: true,
      crosshair: true,
      boxSelect: true
    },
    margins: { top: 20, right: 30, bottom: 40, left: 60 }
  });

  // Create trace and get handle
  const spectrumTrace = useRef<TraceHandle1D>();

  useEffect(() => {
    spectrumTrace.current = plot.addTrace1D({
      type: Trace1DType.Line,
      color: '#00ff00',
      lineWidth: 2
    });
  }, []);

  // Update data when FFT arrives
  useEffect(() => {
    if (fftData && spectrumTrace.current) {
      spectrumTrace.current.update({
        x: frequencyArray,
        y: fftData.bins
      });
    }
  }, [fftData]);

  return <canvas ref={plot.canvasRef} width={800} height={400} />;
}
```

### Return Value

```typescript
interface PlotInstance {
  // Canvas ref to attach to <canvas> element
  canvasRef: RefObject<HTMLCanvasElement>;

  // Trace management - type-safe 1D and 2D trace addition
  addTrace1D: (config: Trace1DConfig) => TraceHandle1D;
  addTrace2D: (config: Trace2DConfig) => TraceHandle2D;
  clearTraces: () => void;

  // Axis control
  setAxisRange: (axis: 'x' | 'y', min: number, max: number) => void;
  getAxisRange: (axis: 'x' | 'y') => { min: number; max: number };
  autoRange: (axis: 'x' | 'y' | 'both', padding?: number) => void;

  // Interaction events (optional)
  onZoom: (callback: (range: AxisRange) => void) => void;
  onPan: (callback: (range: AxisRange) => void) => void;
  onCursor: (callback: (info: CursorInfo | null) => void) => void;

  // Manual render control (usually not needed)
  requestRender: () => void;

  // Cleanup (usually automatic)
  destroy: () => void;
}

// Handle returned by addTrace1D for updating/removing 1D traces
interface TraceHandle1D {
  update: (data: TraceData1D) => void;
  setVisible: (visible: boolean) => void;
  setConfig: (config: Partial<Trace1DConfig>) => void;
  remove: () => void;
}

// Handle returned by addTrace2D for updating/removing 2D traces
interface TraceHandle2D {
  update: (data: TraceData2D) => void;
  setVisible: (visible: boolean) => void;
  setConfig: (config: Partial<Trace2DConfig>) => void;
  remove: () => void;
}
```

---

## Configuration Types

### `PlotConfig`

```typescript
interface PlotConfig {
  // Axis configuration
  axes: {
    x: AxisConfig;
    y: AxisConfig;
  };

  // Grid configuration
  grid?: {
    show?: boolean;
    color?: string;
    lineWidth?: number;
    xLines?: number | 'auto';  // number of grid lines or auto-calculate
    yLines?: number | 'auto';
  };

  // Interaction configuration
  interactions?: {
    zoom?: boolean | 'x' | 'y' | 'both';
    pan?: boolean | 'x' | 'y' | 'both';  // 'x' = horizontal only, 'y' = vertical only
    crosshair?: boolean;
    boxSelect?: boolean;  // shift+drag to zoom to box
    tooltip?: boolean;
  };

  // Plot area margins
  margins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };

  // Appearance
  background?: string;
  textColor?: string;
  fontSize?: number;
  fontFamily?: string;

  // Legend (optional)
  legend?: {
    show?: boolean;  // default: false
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    background?: string;
    textColor?: string;
  };

  // Performance options
  highDPI?: boolean;  // default: true
  maxRenderRate?: number;  // max FPS, default: 60
}
```

### `AxisConfig`

```typescript
interface AxisConfig {
  label?: string;
  formatter?: (value: number) => string;
  range?: { min: number; max: number };
  scale?: 'linear' | 'log';  // future: support log scale

  // Tick configuration
  ticks?: {
    count?: number | 'auto';
    formatter?: (value: number) => string;
    color?: string;
    length?: number;
  };
}

// Auto-ranging behavior:
// - If range is not specified, auto-range is calculated from first data update
// - After initial auto-range, axes remain fixed (points can fall off screen)
// - Call plot.autoRange('x' | 'y' | 'both') to explicitly re-calculate
```

### `Trace1DConfig` and `Trace2DConfig`

**1D Traces** (line, stem, scatter, area):

```typescript
enum Trace1DType {
  Line = 'line',
  Stem = 'stem',
  Scatter = 'scatter',
  Area = 'area'
}

interface Trace1DConfig {
  type: Trace1DType;

  // Common styling
  color: string;
  lineWidth?: number;
  opacity?: number;

  // Line-specific options
  dashPattern?: number[];  // e.g., [5, 5] for dashed line

  // Scatter-specific options
  pointSize?: number;
  pointShape?: 'circle' | 'square' | 'triangle';

  // Area-specific options
  fillColor?: string;
  fillOpacity?: number;
  baseline?: number;  // y-value for area baseline (default: 0)

  // Legend
  label?: string;  // label shown in legend (if legend is enabled)

  // Visibility & ordering
  visible?: boolean;
  zIndex?: number;  // render order (higher = on top)
}
```

**2D Traces** (heatmaps, spectrograms):

```typescript
interface Trace2DConfig {
  // No type enum - only one 2D trace type

  // Color mapping
  colorMap: ColorMapName | CustomColorMap;  // required
  valueRange: { min: number; max: number };  // maps Z values to colors

  // Rendering
  interpolation?: 'nearest' | 'bilinear';  // default: 'nearest'
  opacity?: number;

  // Legend
  label?: string;  // label shown in legend (if legend is enabled)

  // Visibility & ordering
  visible?: boolean;
  zIndex?: number;  // render order (typically 0 for background)
}
```

**Note:** Smoothing/filtering is handled by users maintaining their own state.
The library focuses on rendering, not data processing.

### `TraceData`

```typescript
// 1D trace data (line, stem, scatter, area)
interface TraceData1D {
  x: number[] | Float32Array;
  y: number[] | Float32Array;
}

// 2D trace data (image, heatmap, spectrogram)
interface TraceData2D {
  x: number[] | Float32Array;      // 1D: x-axis values
  y: number[] | Float32Array;      // 1D: y-axis values
  z: number[][] | Float32Array;    // 2D: intensity values
  width?: number;                  // required if z is flat Float32Array
  height?: number;                 // required if z is flat Float32Array
}

type TraceData = TraceData1D | TraceData2D;
```

---

## Advanced Usage Examples

### Example 1: FFT Display with Threshold Line

```typescript
function FFTDisplay({ fftData, threshold }) {
  const plot = usePlot({
    axes: {
      x: {
        label: 'Frequency',
        formatter: formatFrequency,
        range: { min: fftData.centerFreq - fftData.sampleRate/2,
                 max: fftData.centerFreq + fftData.sampleRate/2 }
      },
      y: {
        label: 'Power (dBm)',
        range: { min: -100, max: 0 }
      }
    },
    interactions: { zoom: true, pan: 'x', crosshair: true }  // pan horizontally only
  });

  // Create trace handles
  const spectrumTrace = useRef<TraceHandle1D>();
  const thresholdTrace = useRef<TraceHandle1D>();

  // Add traces on mount
  useEffect(() => {
    spectrumTrace.current = plot.addTrace1D({
      type: Trace1DType.Line,
      color: '#00ff00',
      lineWidth: 2
    });

    thresholdTrace.current = plot.addTrace1D({
      type: Trace1DType.Line,
      color: '#ff0000',
      lineWidth: 1,
      dashPattern: [5, 5]
    });
  }, []);

  // Update spectrum data
  useEffect(() => {
    if (fftData && spectrumTrace.current) {
      const freqs = generateFrequencyArray(fftData);
      spectrumTrace.current.update({ x: freqs, y: fftData.bins });
    }
  }, [fftData]);

  // Update threshold line
  useEffect(() => {
    if (fftData && thresholdTrace.current) {
      const freqs = [fftData.centerFreq - fftData.sampleRate/2,
                     fftData.centerFreq + fftData.sampleRate/2];
      thresholdTrace.current.update({ x: freqs, y: [threshold, threshold] });
    }
  }, [threshold, fftData]);

  return <canvas ref={plot.canvasRef} width={800} height={400} />;
}
```

### Example 2: Constellation Diagram (I/Q Plot)

```typescript
function ConstellationPlot({ iqData }) {
  const plot = usePlot({
    axes: {
      x: { label: 'In-Phase', range: { min: -1, max: 1 } },
      y: { label: 'Quadrature', range: { min: -1, max: 1 } }
    },
    grid: { show: true },
    interactions: { zoom: 'both', pan: false }
  });

  const symbolsTrace = useRef<TraceHandle1D>();

  useEffect(() => {
    symbolsTrace.current = plot.addTrace1D({
      type: Trace1DType.Scatter,
      color: '#00ffff',
      pointSize: 3,
      opacity: 0.6
    });
  }, []);

  useEffect(() => {
    if (iqData && symbolsTrace.current) {
      symbolsTrace.current.update({ x: iqData.i, y: iqData.q });
    }
  }, [iqData]);

  return <canvas ref={plot.canvasRef} width={400} height={400} />;
}
```

### Example 3: Stem Plot (Impulse Response)

```typescript
function ImpulseResponsePlot({ taps }) {
  const plot = usePlot({
    axes: {
      x: { label: 'Tap Index', range: { min: 0, max: taps.length } },
      y: { label: 'Coefficient', autoRange: true }
    },
    interactions: { zoom: 'both', pan: 'x' }  // pan horizontally only
  });

  const tapsTrace = useRef<TraceHandle1D>();

  useEffect(() => {
    tapsTrace.current = plot.addTrace1D({
      type: Trace1DType.Stem,
      color: '#ffaa00',
      lineWidth: 2
    });
  }, []);

  useEffect(() => {
    if (tapsTrace.current) {
      const indices = Array.from({ length: taps.length }, (_, i) => i);
      tapsTrace.current.update({ x: indices, y: taps });
    }
  }, [taps]);

  return <canvas ref={plot.canvasRef} width={600} height={300} />;
}
```

### Example 4: Multi-Trace Comparison

```typescript
function MultiChannelFFT({ channels }) {
  const plot = usePlot({
    axes: {
      x: { label: 'Frequency', formatter: formatFrequency },
      y: { label: 'Power (dBm)', range: { min: -100, max: 0 } }
    },
    interactions: { zoom: true, pan: 'x', crosshair: true }  // pan horizontally only
  });

  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00'];
  const channelTraces = useRef<TraceHandle1D[]>([]);

  useEffect(() => {
    // Clear old traces
    channelTraces.current = [];

    // Add trace for each channel
    channels.forEach((_, idx) => {
      const trace = plot.addTrace1D({
        type: Trace1DType.Line,
        color: colors[idx],
        lineWidth: 2,
        opacity: 0.8
      });
      channelTraces.current.push(trace);
    });
  }, [channels.length]);

  useEffect(() => {
    channels.forEach((channel, idx) => {
      if (channelTraces.current[idx]) {
        channelTraces.current[idx].update({
          x: channel.frequencies,
          y: channel.powers
        });
      }
    });
  }, [channels]);

  return <canvas ref={plot.canvasRef} width={1000} height={500} />;
}
```

### Example 5: Area Plot (Signal Envelope)

```typescript
function SignalEnvelope({ timeData, envelope }) {
  const plot = usePlot({
    axes: {
      x: { label: 'Time (ms)', formatter: (t) => `${(t*1000).toFixed(1)} ms` },
      y: { label: 'Amplitude', range: { min: -1, max: 1 } }
    }
  });

  const signalTrace = useRef<TraceHandle1D>();
  const envelopeTrace = useRef<TraceHandle1D>();

  useEffect(() => {
    signalTrace.current = plot.addTrace1D({
      type: Trace1DType.Line,
      color: '#00aaff',
      lineWidth: 1
    });

    envelopeTrace.current = plot.addTrace1D({
      type: Trace1DType.Area,
      color: '#ff6600',
      fillColor: '#ff6600',
      fillOpacity: 0.2,
      lineWidth: 2
    });
  }, []);

  useEffect(() => {
    if (signalTrace.current && envelopeTrace.current) {
      signalTrace.current.update({ x: timeData.t, y: timeData.signal });
      envelopeTrace.current.update({ x: timeData.t, y: envelope });
    }
  }, [timeData, envelope]);

  return <canvas ref={plot.canvasRef} width={800} height={300} />;
}
```

---

## Event Handling

### Zoom Events

```typescript
const plot = usePlot({ /* config */ });

plot.onZoom((range) => {
  console.log('New range:', range);
  // { x: { min, max }, y: { min, max } }

  // Update parent state if needed
  setFrequencyRange({ startFreq: range.x.min, endFreq: range.x.max });
});
```

### Cursor Events

```typescript
plot.onCursor((info) => {
  if (info) {
    console.log(`Cursor at (${info.x}, ${info.y})`);
    console.log(`Data values: x=${info.dataX}, y=${info.dataY}`);

    // Update tooltip state
    setTooltip({ visible: true, x: info.canvasX, y: info.canvasY,
                 text: `${formatFrequency(info.dataX)}, ${info.dataY.toFixed(1)} dBm` });
  } else {
    setTooltip({ visible: false });
  }
});
```

---

## Helper Hooks

### `useAxisRange` - Sync with External State

For cases where you want axis ranges controlled by parent components (like SpectrumView coordinating FFT and Waterfall):

```typescript
function FFTDisplay({ frequencyRange, onFrequencyRangeChange }) {
  const plot = usePlot({
    axes: {
      x: { range: { min: frequencyRange.startFreq, max: frequencyRange.endFreq } },
      y: { /* ... */ }
    }
  });

  // Sync external range changes to plot
  useEffect(() => {
    plot.setAxisRange('x', frequencyRange.startFreq, frequencyRange.endFreq);
  }, [frequencyRange]);

  // Sync plot range changes to external state
  plot.onZoom((range) => {
    onFrequencyRangeChange({
      startFreq: range.x.min,
      endFreq: range.x.max
    });
  });

  return <canvas ref={plot.canvasRef} />;
}
```

### `usePlotResize` - Responsive Sizing

```typescript
function ResponsivePlot() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = usePlotResize(containerRef);

  const plot = usePlot({ /* config */ });

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <canvas ref={plot.canvasRef} width={width} height={height} />
    </div>
  );
}
```

---

## Utility Functions

These would be exported alongside the hooks:

```typescript
// Formatting utilities
export function formatFrequency(freq: number): string;
export function formatPower(power: number): string;
export function formatTime(time: number): string;

// Tick calculation
export function calculateTicks(min: number, max: number, targetCount: number): number[];

// Data processing
export function decimateLTTB(data: TraceData, maxPoints: number): TraceData;
export function smooth(data: number[], factor: number): number[];

// Color utilities (from existing colorMaps.ts)
export function buildColorLUT(colorMap: ColorMap): Uint8ClampedArray;
export function dbToColorIndex(db: number, min: number, max: number): number;
```

---

## Type Exports

All types should be exported for TypeScript users:

```typescript
export type {
  PlotConfig,
  PlotInstance,
  AxisConfig,
  TraceConfig,
  TraceData,
  CursorInfo,
  AxisRange,
  // ... etc
};
```

---

## Implementation Notes (for later)

When we implement this, consider:

1. **Performance**:
   - Use `requestAnimationFrame` batching
   - Only re-render when data/config actually changes
   - Support decimation for large datasets (>10k points)
   - Reuse canvas contexts and avoid recreation

2. **Memory**:
   - Pool `Float32Array` buffers for smoothing
   - Avoid creating new arrays on every render
   - Clean up event listeners on unmount

3. **Extensibility**:
   - Plugin system for custom trace types?
   - Custom cursor/tooltip renderers?
   - Custom interaction handlers?

4. **Testing**:
   - Unit tests for coordinate transforms
   - Unit tests for tick calculation
   - Visual regression tests for rendering?

5. **Documentation**:
   - Storybook examples
   - Interactive playground
   - Migration guide from current FFTDisplay

---

## Migration Path

### Before (Current FFTDisplay):
```typescript
<FFTDisplay
  width={containerWidth}
  height={250}
  frequencyRange={frequencyRange}
  onFrequencyRangeChange={setFrequencyRange}
  minDb={minDb}
  maxDb={maxDb}
/>
```

### After (With Plotting Library):
```typescript
function FFTDisplay({ width, height, frequencyRange, onFrequencyRangeChange, minDb, maxDb }) {
  const plot = usePlot({
    axes: {
      x: { label: 'Frequency', formatter: formatFrequency,
           range: { min: frequencyRange.startFreq, max: frequencyRange.endFreq } },
      y: { label: 'Power (dBm)', range: { min: minDb, max: maxDb } }
    },
    interactions: { zoom: true, pan: 'x', crosshair: true }  // pan horizontally only
  });

  const spectrumTrace = useRef<TraceHandle1D>();

  useEffect(() => {
    spectrumTrace.current = plot.addTrace1D({
      type: Trace1DType.Line,
      color: '#00ff00',
      lineWidth: 2
    });
  }, []);

  useEffect(() => {
    window.addEventListener('fft-data', (e) => {
      const fftData = e.detail;
      const freqs = generateFrequencyArray(fftData);
      if (spectrumTrace.current) {
        spectrumTrace.current.update({ x: freqs, y: fftData.bins });
      }
    });
  }, []);

  plot.onZoom((range) => {
    onFrequencyRangeChange({ startFreq: range.x.min, endFreq: range.x.max });
  });

  return <canvas ref={plot.canvasRef} width={width} height={height} />;
}
```

**Benefits**:
- ~70% less code in component
- All plotting logic reusable
- Easy to add new traces (threshold, markers, etc.)
- Easier to test

---

## Design Decisions Made

Based on feedback and iteration:

1. **✅ Hook-based API**: Modern React style with `usePlot` hook
2. **✅ Trace handles instead of string IDs**: `addTrace1D/2D()` returns handles for type-safe updates
3. **✅ Type-safe trace addition**: Separate `addTrace1D()` and `addTrace2D()` methods
   - `addTrace1D()` accepts `Trace1DConfig` with `Trace1DType` enum
   - `addTrace2D()` accepts `Trace2DConfig` (no type enum needed)
   - TypeScript enforces correct options for each trace type
4. **✅ Configurable line thickness**: `lineWidth` property in trace configs
5. **✅ Clear pan direction**: `pan: 'x'` means horizontal only, `pan: 'y'` means vertical only
6. **✅ Imperative updates**: Trace updates don't trigger React re-renders for performance
7. **✅ No smoothing in library**: Users handle their own data processing/state
8. **✅ Smart auto-ranging**: Only auto-range on first data or explicit request
9. **✅ Unified 1D/2D plotting**: Same `usePlot` hook handles both 1D and 2D traces
10. **✅ Separate waterfall hook**: `useWaterfall` for optimized streaming use case
11. **✅ Optional plot container**: Convenience wrapper, but manual layout works fine

## Performance & Rendering Optimizations

### Dirty Region Tracking

The library should internally optimize rendering by only redrawing what changed:

```typescript
// Internal optimization (transparent to user)
class PlotRenderer {
  private dirtyRegions: Set<'axes' | 'grid' | 'traces' | 'cursor'>;

  // Only re-render what's dirty
  render() {
    if (this.dirtyRegions.has('axes')) this.renderAxes();
    if (this.dirtyRegions.has('grid')) this.renderGrid();
    if (this.dirtyRegions.has('traces')) this.renderTraces();
    if (this.dirtyRegions.has('cursor')) this.renderCursor();
  }
}
```

### Multi-Layer Canvas Strategy

Use multiple canvas layers for different update frequencies:

```typescript
// Implementation detail (internal)
- Static layer: axes, grid, labels (rarely changes)
- Data layer: traces (updates frequently)
- Interaction layer: cursor, selection box (updates on mouse move)
```

**Benefits:**
- Cursor movement doesn't re-render traces
- Zoom/pan only updates affected layers
- Significant performance improvement for real-time data

### Buffer Management

The library handles buffer reuse internally:

```typescript
// User just updates data
trace.update({ x: newX, y: newY });

// Library internally:
// - Detects if array size changed
// - Reuses Float32Array buffers when possible
// - Only processes changed data
// - Batches updates in RAF
```

**User doesn't need to worry about:**
- Canvas context management
- Buffer pooling
- Render batching
- Dirty tracking

---

## Multi-Trace X Coordinates

### Each Trace Has Independent X,Y Data

Different traces can have completely different X coordinates and sampling:

```typescript
// FFT: continuous, many points
fftTrace.update({
  x: [2.4e9, 2.400001e9, 2.400002e9, ...],  // 512 points
  y: [-80, -79, -75, ...]
});

// Detection markers: discrete, few points
markerTrace.update({
  x: [2.45e9, 2.48e9],  // only 2 points
  y: [-50, -45]
});
```

The coordinate system handles this naturally - each trace's X values are independently mapped to canvas coordinates.

### Use Cases

**Example: FFT with Detection Markers**

```typescript
function FFTWithDetections({ fftData, detections }) {
  const plot = usePlot({
    axes: {
      x: { label: 'Frequency', formatter: formatFrequency },
      y: { label: 'Power (dBm)', range: { min: -100, max: 0 } }
    }
  });

  const fftTrace = useRef<TraceHandle1D>();
  const markerTrace = useRef<TraceHandle1D>();

  useEffect(() => {
    // Continuous FFT line
    fftTrace.current = plot.addTrace1D({
      type: Trace1DType.Line,
      color: '#00ff00',
      lineWidth: 2
    });

    // Discrete detection markers
    markerTrace.current = plot.addTrace1D({
      type: Trace1DType.Stem,  // or Scatter for dots
      color: '#ff0000',
      lineWidth: 3,
      pointSize: 6
    });
  }, []);

  useEffect(() => {
    // Update FFT (512 points)
    if (fftData && fftTrace.current) {
      fftTrace.current.update({
        x: generateFrequencyArray(fftData),
        y: fftData.bins
      });
    }
  }, [fftData]);

  useEffect(() => {
    // Update markers (variable number of points)
    if (detections && markerTrace.current) {
      markerTrace.current.update({
        x: detections.map(d => d.frequency),
        y: detections.map(d => d.power)
      });
    }
  }, [detections]);

  return <canvas ref={plot.canvasRef} width={800} height={400} />;
}
```

**Key Point:** The library doesn't require traces to share X coordinates. Each trace is independent.

---

## Unified 1D/2D Plotting

**The same `usePlot` hook handles both 1D and 2D traces!**

### 2D Image Traces (Heatmaps, Spectrograms)

Use `type: 'image'` to add 2D data:

```typescript
function Spectrogram({ data }) {
  const plot = usePlot({
    axes: {
      x: { label: 'Frequency', formatter: formatFrequency },
      y: { label: 'Time', formatter: (t) => `${t.toFixed(1)}s` }
    },
    interactions: { zoom: 'both', pan: 'both' }
  });

  const imageTrace = useRef<TraceHandle2D>();

  useEffect(() => {
    imageTrace.current = plot.addTrace2D({
      colorMap: 'plasma',
      valueRange: { min: -100, max: 0 },  // dB range for color mapping
      interpolation: 'nearest'
    });
  }, []);

  useEffect(() => {
    if (data && imageTrace.current) {
      imageTrace.current.update({
        x: frequencyArray,      // 1D: [f0, f1, f2, ...]
        y: timeArray,           // 1D: [t0, t1, t2, ...]
        z: intensityMatrix      // 2D: [[z00, z01, ...], [z10, z11, ...], ...]
      });
    }
  }, [data]);

  return <canvas ref={plot.canvasRef} width={800} height={600} />;
}
```

### Streaming Waterfall Hook

For streaming waterfall displays, use the specialized `useWaterfall` hook:

```typescript
function WaterfallDisplay({ frequencyRange }) {
  const waterfall = useWaterfall({
    frequencyRange,
    colorMap: 'plasma',
    valueRange: { min: -100, max: 0 },
    height: 400,  // number of rows to keep in buffer
    scrollDirection: 'down',  // or 'up'
    interactions: { zoom: 'x', pan: 'x' }
  });

  useEffect(() => {
    const handleFFT = (e: CustomEvent<FFTData>) => {
      // Just push new row - waterfall handles scrolling/buffering
      waterfall.addRow(e.detail.bins);
    };

    window.addEventListener('fft-data', handleFFT);
    return () => window.removeEventListener('fft-data', handleFFT);
  }, []);

  return <canvas ref={waterfall.canvasRef} width={800} height={400} />;
}
```

**Why separate `useWaterfall`?**
- Highly optimized for streaming (efficient row shifting, ImageData reuse)
- Different API pattern (`addRow()` vs full `update()`)
- Maintains a rolling buffer of fixed height
- Special implementation details for performance

### Color Map Support

```typescript
type ColorMapName =
  | 'plasma'      // current default
  | 'viridis'
  | 'turbo'
  | 'grayscale'
  | 'jet'
  | 'hot'
  | 'cool';

// Custom color maps
interface CustomColorMap {
  stops: Array<{ position: number; color: string }>;
}

// Usage
imageTrace.setColorMap('viridis');
// or
imageTrace.setColorMap({
  stops: [
    { position: 0.0, color: '#000000' },
    { position: 0.5, color: '#ff0000' },
    { position: 1.0, color: '#ffffff' }
  ]
});
```

### Mixing 1D and 2D Traces

You can overlay 1D traces on top of 2D image traces:

```typescript
function SpectrogramWithCursor({ data, cursorFreq }) {
  const plot = usePlot({
    axes: {
      x: { label: 'Frequency', formatter: formatFrequency },
      y: { label: 'Time' }
    },
    interactions: { zoom: 'both', pan: 'both' }
  });

  const imageTrace = useRef<TraceHandle2D>();
  const cursorTrace = useRef<TraceHandle1D>();

  useEffect(() => {
    // Add 2D image trace
    imageTrace.current = plot.addTrace2D({
      colorMap: 'plasma',
      valueRange: { min: -100, max: 0 },
      zIndex: 0  // render first (background)
    });

    // Add 1D vertical line on top of 2D image
    cursorTrace.current = plot.addTrace1D({
      type: Trace1DType.Line,
      color: '#ffffff',
      lineWidth: 2,
      dashPattern: [5, 5],
      zIndex: 1  // render on top
    });
  }, []);

  useEffect(() => {
    // Update 2D spectrogram
    if (data && imageTrace.current) {
      imageTrace.current.update({
        x: data.frequencies,
        y: data.times,
        z: data.intensities
      });
    }
  }, [data]);

  useEffect(() => {
    // Update 1D cursor line
    if (cursorTrace.current) {
      const yRange = plot.getAxisRange('y');
      cursorTrace.current.update({
        x: [cursorFreq, cursorFreq],
        y: [yRange.min, yRange.max]
      });
    }
  }, [cursorFreq]);

  return <canvas ref={plot.canvasRef} width={800} height={600} />;
}
```

**This works because `usePlot` accepts any trace type - 1D or 2D!**

---

## Plot Container API (Optional)

For multi-plot layouts (e.g., stacked FFT + Waterfall), a container component can simplify arrangement:

```typescript
import { PlotContainer } from '@/utils/plotting';

function SpectrumView() {
  return (
    <PlotContainer
      layout="vertical"  // or 'horizontal', 'grid'
      sizes={[250, 400]}  // heights for each plot
      gap={10}           // spacing between plots
      syncZoom="x"       // sync x-axis zoom/pan across plots
    >
      <FFTDisplay />
      <WaterfallDisplay />
    </PlotContainer>
  );
}
```

### PlotContainer Props

```typescript
interface PlotContainerProps {
  layout: 'vertical' | 'horizontal' | 'grid';
  sizes?: number[];           // explicit sizes (px or flex ratios)
  gap?: number;              // spacing between plots in pixels
  syncZoom?: 'x' | 'y' | 'both' | false;  // sync zoom/pan
  syncCursor?: boolean;      // sync cursor position
  children: ReactNode;
}
```

### Example: FFT + Waterfall Stack

```typescript
function SpectrumView() {
  const [frequencyRange, setFrequencyRange] = useState({
    startFreq: 2.4e9,
    endFreq: 2.5e9
  });

  return (
    <PlotContainer
      layout="vertical"
      sizes={[250, 400]}
      gap={10}
      syncZoom="x"
    >
      <FFTDisplay
        frequencyRange={frequencyRange}
        onFrequencyRangeChange={setFrequencyRange}
      />
      <WaterfallDisplay
        frequencyRange={frequencyRange}
        onFrequencyRangeChange={setFrequencyRange}
      />
    </PlotContainer>
  );
}
```

**Alternative: Manual Layout**

If you prefer more control, just use regular CSS/flexbox:

```typescript
function SpectrumView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ height: 250 }}>
        <FFTDisplay />
      </div>
      <div style={{ height: 400 }}>
        <WaterfallDisplay />
      </div>
    </div>
  );
}
```

**Note:** PlotContainer is a convenience wrapper. Manual layouts work just fine!

---

## Additional Features

### Legends (Optional)

Legends can be enabled for multi-trace plots:

```typescript
const plot = usePlot({
  axes: { /* ... */ },
  legend: {
    show: false,  // default: false
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left',
    background: 'rgba(0, 0, 0, 0.8)',
    textColor: '#ffffff'
  }
});

// Traces can have labels for legends
plot.addTrace1D({
  type: Trace1DType.Line,
  color: '#00ff00',
  lineWidth: 2,
  label: 'Channel 1'  // shown in legend if enabled
});

plot.addTrace1D({
  type: Trace1DType.Line,
  color: '#0000ff',
  lineWidth: 2,
  label: 'Channel 2'
});
```

### Color Maps

Supported color maps for 2D traces:
- `'plasma'` (default)
- `'viridis'`
- `'turbo'`
- `'grayscale'`
- `'jet'`
- `'hot'`
- `'cool'`

Custom color maps can be created with gradient stops:
```typescript
plot.addTrace2D({
  colorMap: {
    stops: [
      { position: 0.0, color: '#000000' },
      { position: 0.5, color: '#ff0000' },
      { position: 1.0, color: '#ffffff' }
    ]
  },
  valueRange: { min: -100, max: 0 }
});
```

### Future Considerations

**Not planned for initial version:**
- Markers/annotations (may add later if needed)
- Log scale axes (not needed - users can provide log-scaled data like dB, and axes will display linearly)
- Export to PNG/SVG (not a priority)
- Advanced legend customization (basic version sufficient for now)

---

## Next Steps

1. Get feedback on this API design
2. Create detailed implementation plan
3. Build prototype of `usePlot` hook
4. Implement core trace types (line, stem, scatter)
5. Add interaction handlers
6. Migrate FFTDisplay as proof of concept
7. Expand to other plot types
