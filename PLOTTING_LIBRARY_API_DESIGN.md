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
import { CursorStyle, usePlot } from '@/utils/plotting';

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
      lineWidth: 1
    },
    interactions: {
      zoom: 'x',
      pan: 'x',
      boxSelect: true,
      cursor: {
        style: CursorStyle.Vertical,
        snap: true,
      },
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
  onZoom: (
    callback: (axis: 'x' | 'y' | 'both', range: AxisRange) => void
  ) => () => void;
  onPan: (
    callback: (axis: 'x' | 'y' | 'both', range: AxisRange) => void
  ) => () => void;
  onCursor: (callback: (info: CursorInfo | null) => void) => () => void;

  // Manual render control (usually not needed)
  requestRender: () => void;

  // Cleanup (usually automatic)
  destroy: () => void;
}

interface AxisRange {
  min: number;
  max: number;
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

interface CursorInfo {
  canvasX: number;
  canvasY: number;
  dataX: number;
  dataY: number;
  snapped: null | {
    traceId: string;
    x: number;
    y: number;
  };
}

// `snapped` is non-null when the cursor is locked to the nearest 1D data
// point. The library provides a stable `traceId` that matches the trace
// returned by `addTrace1D/2D`, so host components can look up metadata as
// needed. When snap is disabled (e.g., for 2D traces) the `dataX`/`dataY`
// fields still reflect the sampled values under the cursor.
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
    dashPattern?: number[];
  };

  // Interaction configuration
  interactions?: {
    zoom?: boolean | 'x' | 'y' | 'both';
    pan?: boolean | 'x' | 'y' | 'both';  // 'x' = horizontal only, 'y' = vertical only

    // Cursor/crosshair configuration
    cursor?:
      | boolean
      | {
          style?: CursorStyle;  // defaults to CursorStyle.Crosshair
          snap?: boolean;       // defaults to true for 1D traces
        };

    boxSelect?: boolean;  // shift+drag to zoom to box
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
  highDPI?: boolean;
  cursor?: {
    render?: (args: CursorRenderArgs) => void;
  };
}

// Notes:
// - `tooltip`, `legend`, and `maxRenderRate` exist in the TypeScript types but
//   are currently ignored. We'll wire them up as part of the future enhancements
//   listed near the end of this document.
```

### `AxisConfig`

```typescript
interface AxisConfig {
  label?: string;
  formatter?: (value: number) => string;
  range?: { min: number; max: number };
  scale?: 'linear' | 'log';
  ticks?: {
    formatter?: (value: number) => string;
  };
}

// Notes:
// - If you omit range, initialize the axis via data updates or call autoRange().
// - `ticks.count` is currently ignored; tick density is chosen automatically.
```

### Enums

```typescript
enum Trace1DType {
  Line = 'line',
  Stem = 'stem',
  Scatter = 'scatter',
  Area = 'area',
}

enum CursorStyle {
  Crosshair = 'crosshair',
  Vertical = 'vertical',
  Horizontal = 'horizontal',
  None = 'none',
}
```

### `Trace1DConfig` and `Trace2DConfig`

**1D Traces** (line, stem, scatter, area):

```typescript

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

  // Area-specific options
  fillColor?: string;
  fillOpacity?: number;
  baseline?: number;  // y-value for area baseline (default: 0)

  // Visibility & ordering
  visible?: boolean;
  zIndex?: number;  // render order (higher = on top)
}
```

**2D Traces** (heatmaps, spectrograms):

```typescript
interface Trace2DConfig {
  // Color mapping
  colorMap: unknown;
  valueRange: { min: number; max: number };
  opacity?: number;
  visible?: boolean;
  zIndex?: number;  // render order (typically 0 for background)
}
```

**Note:** The 2D trace shape is in place to support upcoming image/spectrogram
rendering. The current canvas renderer ignores 2D traces, so keep using
`WaterfallDisplay` until we land the new image pipeline.

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

## Cursor & Tooltip Behaviour

- Configure the visual crosshair via `interactions.cursor`. Supported styles are `Crosshair`, `Vertical`, `Horizontal`, and `None`. Passing `true` uses the default crosshair; passing `false` disables the cursor entirely.
- Snapping is enabled by default so the cursor locks onto the nearest finite X value across all visible 1D traces. Set `snap: false` to let the cursor follow the pointer exactly.
- Use `plot.onCursor` to subscribe to cursor updates. The hook emits `CursorInfo` with canvas coordinates, data values, and optional snap metadata. Host components are responsible for rendering tooltips or overlays (see `FFTDisplay` for an example DOM tooltip).
- 2D traces currently do not participate in cursor snapping. Once the image/spectrogram renderer lands we will revisit cursor semantics for 2D data.

## Event Handling

### Zoom Events

```typescript
const plot = usePlot({ /* config */ });

useEffect(() => {
  const unsubscribe = plot.onZoom((axis, range) => {
    if (axis !== 'x') return;
    console.log('New x range:', range);
    setFrequencyRange({ startFreq: range.min, endFreq: range.max });
  });
  return unsubscribe;
}, [plot]);

useEffect(() => {
  const unsubscribe = plot.onPan((axis, range) => {
    if (axis !== 'x') return;
    console.log('Pan delta:', range);
    setFrequencyRange({ startFreq: range.min, endFreq: range.max });
  });
  return unsubscribe;
}, [plot]);
```

### Cursor Events

```typescript
useEffect(() => {
  const unsubscribe = plot.onCursor((info) => {
    if (!info) {
      setTooltip({ visible: false });
      return;
    }

    console.log(`Cursor canvas position: (${info.canvasX}, ${info.canvasY})`);
    console.log(`Data values: x=${info.dataX}, y=${info.dataY}`);

    setTooltip({
      visible: true,
      x: info.canvasX,
      y: info.canvasY,
      text: `${formatFrequency(info.dataX)}, ${info.dataY.toFixed(1)} dBm`,
    });
  });
  return unsubscribe;
}, [plot]);
```

---

## Helper Hooks

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
  TraceHandle1D,
  TraceHandle2D,
  WaterfallInstance,
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

  useEffect(() => {
    if (!onFrequencyRangeChange) return;
    const unsubscribe = plot.onZoom((axis, range) => {
      if (axis !== 'x') return;
      onFrequencyRangeChange({ startFreq: range.min, endFreq: range.max });
    });
    return unsubscribe;
  }, [plot, onFrequencyRangeChange]);

  return <canvas ref={plot.canvasRef} width={width} height={height} />;
}
```

**Benefits**:
- ~70% less code in component
- All plotting logic reusable
- Easy to add new traces (threshold, markers, etc.)
- Easier to test

### Current Usage Notes

- `FFTDisplay` drives a `usePlot` instance and keeps smoothing/decimation in the component. Zoom/pan callbacks feed `onFrequencyRangeChange` just like the legacy version.
- `WaterfallDisplay` still uses bespoke ImageData management. Once the 2D renderer is ready we will migrate it to the shared hook.
- `SpectrumView` owns the shared frequency and dB ranges, wiring them into both child plots via `setAxisRange`/`onZoom`/`onPan` hooks.

### Data Ingress & Event Wiring
- The plotting library stays agnostic about the FFT source. Continue listening for `window` events (see `FFTDisplay.tsx:63-88` and `WaterfallDisplay.tsx:195-204`), and forward each update through the appropriate trace handle or `addRow`.
- Retain any upstream smoothing, decimation, or thresholding logic in the components; the library focuses solely on rendering performance.

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
9. **🔄 2D traces on the roadmap**: Type definitions are in place; the renderer will land alongside the spectrogram work.
10. **✅ Optional plot container**: Convenience wrapper, but manual layout works fine
11. **✅ Cursor events for tooltips**: `plot.onCursor` emits data so host components can render overlays with React DOM.

## Performance & Rendering Optimizations

### Dirty Region Tracking

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

## Future Enhancements

The following items are scoped for upcoming work:

- **2D image renderer**: hook `addTrace2D` into the canvas pipeline so spectrograms and heatmaps can share the plotting stack.
- **Legend + color map controls**: expose a lightweight legend for multi-trace plots and a concrete color-map API once image traces render.
- **Grid/tick density overrides**: honour `grid.xLines`, `grid.yLines`, and `ticks.count` so callers can tune labeling density.
- **Render throttling**: support `config.maxRenderRate` to cap redraw frequency when data bursts in faster than the display needs.
- **Cursor styling callbacks**: allow custom cursor renderers to fall back on the built-in draw routine while tweaking colours/widths.

## Next Steps

1. Implement the shared 2D/image trace renderer and connect it to `addTrace2D`.
2. Migrate `WaterfallDisplay` onto the plotting hook once the 2D path is stable.
3. Wire up grid/tick density overrides and the lightweight legend API.
4. Add render throttling (`maxRenderRate`) and richer cursor styling options.
5. Expand tests and docs to cover the new 2D capabilities and integration patterns.
