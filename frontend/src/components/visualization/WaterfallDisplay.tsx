import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { FFTData, FrequencyRange } from "../../types/sdr";
import { ColorMap } from "../../utils/colorMaps";
import { formatFrequency } from "../../utils/formatters";
import { CursorStyle, usePlot, type PlotInstance, type TraceHandle2D } from "../../utils/plotting";

interface WaterfallDisplayProps {
  width: number;
  height: number;
  colorMap: ColorMap;
  minDb: number;
  maxDb: number;
  frequencyRange: FrequencyRange;
  onFrequencyRangeChange?: (range: FrequencyRange) => void;
  dataKey?: string;
}

const MARGINS = { top: 20, right: 30, bottom: 40, left: 60 };
const BACKGROUND = "rgba(10, 10, 15, 0.85)";
const GRID_COLOR = "rgba(255, 255, 255, 0.1)";

type WaterfallState = {
  width: number;
  height: number;
  z: Float32Array;
};

type TraceEntry = {
  handle: TraceHandle2D;
  id: string | null;
};

const buildYAxis = (length: number): Float32Array => {
  const axis = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    axis[i] = i;
  }
  return axis;
};

const findNewTraceId = (
  plot: PlotInstance,
  before: Set<string>
): string | null => {
  const debug = (plot as any).__debug;
  if (!debug) {
    return plot.getPrimaryTrace();
  }
  for (const id of debug.traceIds) {
    if (!before.has(id)) {
      return id;
    }
  }
  return plot.getPrimaryTrace();
};

export const WaterfallDisplay = memo(function WaterfallDisplay({
  width,
  height,
  colorMap,
  minDb,
  maxDb,
  frequencyRange,
  onFrequencyRangeChange,
  dataKey,
}: WaterfallDisplayProps) {
  const historyLength = useMemo(() => {
    const drawableHeight = Math.max(height - MARGINS.top - MARGINS.bottom, 1);
    return Math.max(1, Math.floor(drawableHeight));
  }, [height]);

  const historyLengthRef = useRef(historyLength);
  useEffect(() => {
    historyLengthRef.current = historyLength;
  }, [historyLength]);

  const plotConfig = useMemo(
    () => ({
      axes: {
        x: {
          label: "Frequency (Hz)",
          range: {
            min: frequencyRange.startFreq,
            max: frequencyRange.endFreq,
          },
          formatter: (value: number) => formatFrequency(value, true),
        },
        y: {
          label: "History (rows)",
          range: { min: 0, max: Math.max(1, historyLength - 1) },
          formatter: (value: number) => `${Math.round(value)}`,
        },
      },
      background: BACKGROUND,
      grid: {
        show: true,
        color: GRID_COLOR,
      },
      margins: MARGINS,
      interactions: {
        zoom: "x" as const,
        pan: "x" as const,
        cursor: {
          style: CursorStyle.Crosshair,
          snap: false,
        },
      },
    }),
    [frequencyRange, historyLength]
  );

  const plot = usePlot(plotConfig);
  const traceRef = useRef<TraceEntry | null>(null);
  const waterfallRef = useRef<WaterfallState | null>(null);
  const xAxisRef = useRef<Float32Array | null>(null);
  const yAxisRef = useRef<Float32Array | null>(null);
  const fftMetaRef = useRef<{ sampleRate: number; centerFreq: number } | null>(
    null
  );
  const ensurePrimaryTrace = useCallback(() => {
    const entry = traceRef.current;
    if (!entry || !entry.id) return;
    if (plot.getPrimaryTrace() !== entry.id) {
      plot.setPrimaryTrace(entry.id);
    }
  }, [plot]);
  const ensureYAxis = useCallback(() => {
    const targetLength = historyLengthRef.current;
    let yAxis = yAxisRef.current;
    if (!yAxis || yAxis.length !== targetLength) {
      yAxis = buildYAxis(targetLength);
      yAxisRef.current = yAxis;
    }
    return yAxis;
  }, []);

  const initialTraceConfigRef = useRef<{
    colorMap: ColorMap;
    minDb: number;
    maxDb: number;
  } | null>(null);
  if (!initialTraceConfigRef.current) {
    initialTraceConfigRef.current = { colorMap, minDb, maxDb };
  }

  useEffect(() => {
    const debug = (plot as any).__debug;
    const prevIds = debug
      ? new Set<string>(debug.traceIds)
      : new Set<string>();
    const initialConfig = initialTraceConfigRef.current ?? {
      colorMap,
      minDb,
      maxDb,
    };
    const trace = plot.addTrace2D({
      colorMap: initialConfig.colorMap,
      valueRange: { min: initialConfig.minDb, max: initialConfig.maxDb },
      opacity: 1,
      zIndex: 0,
    });
    const traceId = findNewTraceId(plot, prevIds);
    traceRef.current = { handle: trace, id: traceId ?? null };
    ensurePrimaryTrace();
    return () => {
      trace.remove();
      traceRef.current = null;
      waterfallRef.current = null;
      xAxisRef.current = null;
      yAxisRef.current = null;
      fftMetaRef.current = null;
    };
  }, [plot]);

  useEffect(() => {
    const entry = traceRef.current;
    if (!entry) {
      return;
    }
    entry.handle.setConfig({
      colorMap,
      valueRange: { min: minDb, max: maxDb },
    });
    plot.requestRender();
  }, [colorMap, minDb, maxDb, plot]);

  useEffect(() => {
    const current = plot.getAxisRange("x");
    if (
      current.min !== frequencyRange.startFreq ||
      current.max !== frequencyRange.endFreq
    ) {
      plot.setAxisRange("x", frequencyRange.startFreq, frequencyRange.endFreq);
    }
  }, [plot, frequencyRange]);

  useEffect(() => {
    const targetMax = Math.max(1, historyLength - 1);
    const current = plot.getAxisRange("y");
    if (current.min !== 0 || current.max !== targetMax) {
      plot.setAxisRange("y", 0, targetMax);
    }
  }, [plot, historyLength]);

  useEffect(() => {
    waterfallRef.current = null;
    yAxisRef.current = null;
    xAxisRef.current = null;
    fftMetaRef.current = null;
    const entry = traceRef.current;
    if (!entry) return;
    entry.handle.update({
      x: new Float32Array(0),
      y: new Float32Array(0),
      z: new Float32Array(0),
      width: 0,
      height: 0,
    });
    ensurePrimaryTrace();
  }, [ensurePrimaryTrace, historyLength]);

  useEffect(() => {
    waterfallRef.current = null;
    yAxisRef.current = null;
    xAxisRef.current = null;
    fftMetaRef.current = null;
    const entry = traceRef.current;
    if (!entry) return;
    entry.handle.update({
      x: new Float32Array(0),
      y: new Float32Array(0),
      z: new Float32Array(0),
      width: 0,
      height: 0,
    });
    ensurePrimaryTrace();
  }, [dataKey, ensurePrimaryTrace]);

  const addFFTRow = useCallback(
    (fftData: FFTData) => {
      const entry = traceRef.current;
      if (!entry) return;

      const targetHeight = historyLengthRef.current;
      if (targetHeight <= 0) return;

      const binCount = fftData.bins.length;
      if (!binCount) return;

      let state = waterfallRef.current;
      if (!state || state.width !== binCount || state.height !== targetHeight) {
        state = {
          width: binCount,
          height: targetHeight,
          z: new Float32Array(binCount * targetHeight),
        };
        state.z.fill(Number.NaN);
        waterfallRef.current = state;
      }

      let xAxis = xAxisRef.current;
      const meta = fftMetaRef.current;
      if (
        !xAxis ||
        xAxis.length !== binCount ||
        !meta ||
        meta.sampleRate !== fftData.sampleRate ||
        meta.centerFreq !== fftData.centerFreq
      ) {
        xAxis = new Float32Array(binCount);
        const startFreq = fftData.centerFreq - fftData.sampleRate / 2;
        const binWidth = fftData.sampleRate / binCount;
        for (let i = 0; i < binCount; i += 1) {
          xAxis[i] = startFreq + i * binWidth;
        }
        xAxisRef.current = xAxis;
        fftMetaRef.current = {
          sampleRate: fftData.sampleRate,
          centerFreq: fftData.centerFreq,
        };
      }

      const yAxis = ensureYAxis();
      const { z, width: rowWidth, height: rowCount } = state;
      if (rowCount > 1) {
        z.copyWithin(rowWidth, 0, rowWidth * (rowCount - 1));
      }

      for (let i = 0; i < rowWidth; i += 1) {
        const value = fftData.bins[i];
        z[i] = Number.isFinite(value) ? value : minDb;
      }

      entry.handle.update({
        x: xAxisRef.current ?? new Float32Array(0),
        y: yAxis,
        z,
        width: rowWidth,
        height: rowCount,
      });

      ensurePrimaryTrace();
    },
    [ensurePrimaryTrace, ensureYAxis, minDb]
  );

  useEffect(() => {
    const handleFFTData = (event: Event) => {
      const fftEvent = event as CustomEvent<FFTData>;
      addFFTRow(fftEvent.detail);
    };

    window.addEventListener("fft-data", handleFFTData);
    return () => {
      window.removeEventListener("fft-data", handleFFTData);
    };
  }, [addFFTRow]);

  useEffect(() => {
    const zoomUnsub = plot.onZoom((axis, range) => {
      if (axis !== "x" || !onFrequencyRangeChange) return;
      onFrequencyRangeChange({
        startFreq: range.min,
        endFreq: range.max,
      });
    });

    const panUnsub = plot.onPan((axis, range) => {
      if (axis !== "x" || !onFrequencyRangeChange) return;
      onFrequencyRangeChange({
        startFreq: range.min,
        endFreq: range.max,
      });
    });

    return () => {
      zoomUnsub();
      panUnsub();
    };
  }, [plot, onFrequencyRangeChange]);

  useEffect(() => {
    plot.requestRender();
  }, [plot, width, height]);

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        background: BACKGROUND,
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      <canvas
        ref={plot.canvasRef}
        width={width}
        height={height}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
});
