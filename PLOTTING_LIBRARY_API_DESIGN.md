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

  // Update data when FFT arrives
  useEffect(() => {
    if (fftData) {
      plot.updateTrace('spectrum', {
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

  // Trace management
  addTrace: (id: string, config: TraceConfig) => void;
  updateTrace: (id: string, data: TraceData) => void;
  removeTrace: (id: string) => void;
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
    pan?: boolean | 'x' | 'y' | 'both';
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
  autoRange?: boolean;  // auto-calculate from data
  scale?: 'linear' | 'log';  // future: support log scale

  // Tick configuration
  ticks?: {
    count?: number | 'auto';
    formatter?: (value: number) => string;
    color?: string;
    length?: number;
  };
}
```

### `TraceConfig`

```typescript
interface TraceConfig {
  type: 'line' | 'stem' | 'scatter' | 'area';

  // Styling
  color: string;
  lineWidth?: number;
  opacity?: number;

  // Line-specific
  dashPattern?: number[];  // e.g., [5, 5] for dashed

  // Scatter-specific
  pointSize?: number;
  pointShape?: 'circle' | 'square' | 'triangle';

  // Area-specific
  fillColor?: string;
  fillOpacity?: number;
  baseline?: number;  // y-value for area baseline

  // Data processing
  smoothing?: number;  // exponential moving average factor (0-1)
  decimation?: 'max-points' | 'lttb' | 'none';  // downsampling strategy
  maxPoints?: number;  // max points to display (for performance)

  // Visibility
  visible?: boolean;
  zIndex?: number;  // render order
}
```

### `TraceData`

```typescript
interface TraceData {
  x: number[] | Float32Array;
  y: number[] | Float32Array;
}

// Or for convenience, array of points
interface TraceDataPoints {
  points: Array<{ x: number; y: number }>;
}
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
    interactions: { zoom: true, pan: 'x', crosshair: true }
  });

  // Add traces on mount
  useEffect(() => {
    plot.addTrace('spectrum', {
      type: 'line',
      color: '#00ff00',
      lineWidth: 2,
      smoothing: 0.9
    });

    plot.addTrace('threshold', {
      type: 'line',
      color: '#ff0000',
      lineWidth: 1,
      dashPattern: [5, 5]
    });
  }, []);

  // Update spectrum data
  useEffect(() => {
    if (fftData) {
      const freqs = generateFrequencyArray(fftData);
      plot.updateTrace('spectrum', { x: freqs, y: fftData.bins });
    }
  }, [fftData]);

  // Update threshold line
  useEffect(() => {
    const freqs = [fftData.centerFreq - fftData.sampleRate/2,
                   fftData.centerFreq + fftData.sampleRate/2];
    plot.updateTrace('threshold', { x: freqs, y: [threshold, threshold] });
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

  useEffect(() => {
    plot.addTrace('symbols', {
      type: 'scatter',
      color: '#00ffff',
      pointSize: 3,
      opacity: 0.6,
      maxPoints: 1000  // limit for performance
    });
  }, []);

  useEffect(() => {
    if (iqData) {
      plot.updateTrace('symbols', { x: iqData.i, y: iqData.q });
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
    interactions: { zoom: 'both', pan: 'x' }
  });

  useEffect(() => {
    plot.addTrace('taps', {
      type: 'stem',
      color: '#ffaa00',
      lineWidth: 2
    });
  }, []);

  useEffect(() => {
    const indices = Array.from({ length: taps.length }, (_, i) => i);
    plot.updateTrace('taps', { x: indices, y: taps });
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
    interactions: { zoom: true, pan: 'x', crosshair: true }
  });

  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00'];

  useEffect(() => {
    channels.forEach((channel, idx) => {
      plot.addTrace(`channel-${idx}`, {
        type: 'line',
        color: colors[idx],
        lineWidth: 2,
        opacity: 0.8
      });
    });
  }, [channels.length]);

  useEffect(() => {
    channels.forEach((channel, idx) => {
      plot.updateTrace(`channel-${idx}`, {
        x: channel.frequencies,
        y: channel.powers
      });
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

  useEffect(() => {
    plot.addTrace('signal', {
      type: 'line',
      color: '#00aaff',
      lineWidth: 1
    });

    plot.addTrace('envelope', {
      type: 'area',
      color: '#ff6600',
      fillColor: '#ff6600',
      fillOpacity: 0.2,
      lineWidth: 2
    });
  }, []);

  useEffect(() => {
    plot.updateTrace('signal', { x: timeData.t, y: timeData.signal });
    plot.updateTrace('envelope', { x: timeData.t, y: envelope });
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
    interactions: { zoom: true, pan: 'x', crosshair: true }
  });

  useEffect(() => {
    plot.addTrace('spectrum', { type: 'line', color: '#00ff00', smoothing: 0.9 });
  }, []);

  useEffect(() => {
    window.addEventListener('fft-data', (e) => {
      const fftData = e.detail;
      const freqs = generateFrequencyArray(fftData);
      plot.updateTrace('spectrum', { x: freqs, y: fftData.bins });
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

## Questions for Refinement

1. **API Style**: Does this hook-based approach feel natural? Any preferences?
2. **Trace Management**: Should traces be declarative (JSX) or imperative (addTrace)?
3. **Event Handling**: Are the event callbacks sufficient, or need more granular control?
4. **Performance**: Any specific performance requirements beyond 60 FPS?
5. **Features**: Any missing features from your pyqtgraph experience?

---

## Next Steps

1. Get feedback on this API design
2. Create detailed implementation plan
3. Build prototype of `usePlot` hook
4. Implement core trace types (line, stem, scatter)
5. Add interaction handlers
6. Migrate FFTDisplay as proof of concept
7. Expand to other plot types
