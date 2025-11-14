import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePlotRenderFps } from "../../hooks";
import {
  usePlot,
  type CursorState,
  type LineLayerHandle,
  type PlotCreationOptions,
} from "../../plot";
import { getVisualizationTheme, toPlotTheme } from "../../styles/theme";
import { FFTDataBatch, FrequencyRange } from "../../types/sdr";
import { formatFrequency } from "../../utils/formatters";
import type { Theme } from "../app/theme-context";
import {
  FFT_PERSISTENCE_CONFIG,
  FFT_SMOOTHING_FACTOR,
} from "./persistenceConfig";
import type { InteractionMode } from "./VisualizationControls";

interface FFTDisplayProps {
  width: number;
  height: number;
  minDb: number;
  maxDb: number;
  frequencyRange: FrequencyRange;
  onFrequencyRangeChange?: (range: FrequencyRange) => void;
  dataKey?: string;
  theme: Theme;
  onRenderFpsChange?: (fps: number) => void;
  interactionMode: InteractionMode;
}

const MAX_POINTS = 2048;

interface LineBuffers {
  freqs: Float32Array;
  powers: Float32Array;
  binIndices: Uint32Array;
  sample: Float32Array;
}

const createLineBuffers = (): LineBuffers => ({
  freqs: new Float32Array(MAX_POINTS),
  powers: new Float32Array(MAX_POINTS),
  binIndices: new Uint32Array(MAX_POINTS),
  sample: new Float32Array(MAX_POINTS),
});

const getLineBuffers = (ref: { current: LineBuffers | null }): LineBuffers => {
  if (!ref.current) {
    ref.current = createLineBuffers();
  }
  return ref.current;
};

export const FFTDisplay = memo(function FFTDisplay({
  width,
  height,
  minDb,
  maxDb,
  frequencyRange,
  onFrequencyRangeChange,
  dataKey,
  theme,
  onRenderFpsChange,
  interactionMode,
}: FFTDisplayProps) {
  const isDark = theme === "dark";
  const vizTheme = useMemo(() => getVisualizationTheme(isDark), [isDark]);
  const plotTheme = useMemo(() => toPlotTheme(vizTheme), [vizTheme]);

  const plotOptions = useMemo<PlotCreationOptions>(
    () => ({
      background: plotTheme.background,
      theme: plotTheme,
      interactions: {
        pan: { x: true, y: false },
        zoom: { x: true, y: false, factor: 0.2 },
        cursor: { enabled: true, style: "crosshair" },
        boxZoom: { mode: "x", modifier: "shift" },
      },
      axes: {
        x: {
          label: "Frequency (Hz)",
          formatter: (value: number) => formatFrequency(value, true),
          ticksTarget: 8,
        },
        y: {
          label: "Power (dB)",
          formatter: (value: number) => `${value.toFixed(1)}`,
          ticksTarget: 4,
        },
      },
    }),
    [plotTheme]
  );

  const { plot, attachCanvas } = usePlot(plotOptions);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const traceRef = useRef<LineLayerHandle | null>(null);
  const maxHoldTraceRef = useRef<LineLayerHandle | null>(null);
  const smoothingRef = useRef<Float32Array | null>(null);
  const lineBuffersRef = useRef<LineBuffers | null>(null);
  const maxHoldRef = useRef<Float32Array | null>(null);
  const fftMetaRef = useRef<{ sampleRate: number; centerFreq: number } | null>(
    null
  );
  const lastFrameTimestampRef = useRef<number | null>(null);
  const [cursorInfo, setCursorInfo] = useState<CursorState | null>(null);
  const renderFps = usePlotRenderFps(plot);

  const handleCanvasAttach = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      canvasRef.current = canvas;
      attachCanvas(canvas);
    },
    [attachCanvas]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.touchAction = "none";
  }, []);

  useEffect(() => {
    if (!plot || plot.isDestroyed()) return;
    const unsubscribeZoom = plot.onZoom((axis, range) => {
      if (axis !== "x" || !onFrequencyRangeChange) return;
      onFrequencyRangeChange({ startFreq: range.min, endFreq: range.max });
    });
    return unsubscribeZoom;
  }, [plot, onFrequencyRangeChange]);

  useEffect(() => {
    if (!plot || plot.isDestroyed()) return;
    const unsubscribePan = plot.onPan((axis, range) => {
      if (axis !== "x" || !onFrequencyRangeChange) return;
      onFrequencyRangeChange({ startFreq: range.min, endFreq: range.max });
    });
    return unsubscribePan;
  }, [plot, onFrequencyRangeChange]);

  useEffect(() => {
    if (!plot || plot.isDestroyed()) return;
    const unsubscribeCursor = plot.onCursor((cursor) => {
      setCursorInfo(cursor);
    });
    return unsubscribeCursor;
  }, [plot]);

  useEffect(() => {
    if (!plot || plot.isDestroyed()) return;

    const cleanupHandles = () => {
      traceRef.current?.remove();
      traceRef.current = null;
      maxHoldTraceRef.current?.remove();
      maxHoldTraceRef.current = null;
    };

    cleanupHandles();

    const maxHoldLine = plot.addLine({
      color: vizTheme.persistence.maxHoldColor,
      lineWidth: FFT_PERSISTENCE_CONFIG.maxHoldLineWidth,
      opacity: FFT_PERSISTENCE_CONFIG.maxHoldOpacity,
    });
    maxHoldTraceRef.current = maxHoldLine;

    const currentLine = plot.addLine({
      color: vizTheme.traceColor,
      lineWidth: 2,
    });
    traceRef.current = currentLine;

    return cleanupHandles;
  }, [plot, vizTheme]);

  useEffect(() => {
    if (!onRenderFpsChange) return;
    onRenderFpsChange(renderFps);
  }, [renderFps, onRenderFpsChange]);

  useEffect(() => {
    return () => {
      onRenderFpsChange?.(0);
    };
  }, [onRenderFpsChange]);

  useEffect(() => {
    if (!plot || plot.isDestroyed()) return;
    const modifier = interactionMode === "zoom" ? "none" : "shift";
    plot.setBoxZoomModifier(modifier);
  }, [plot, interactionMode]);

  useEffect(() => {
    if (!plot || plot.isDestroyed()) return;
    plot.setXRange({
      min: frequencyRange.startFreq,
      max: frequencyRange.endFreq,
    });
  }, [plot, frequencyRange.endFreq, frequencyRange.startFreq]);

  useEffect(() => {
    if (!plot || plot.isDestroyed()) return;
    plot.setYRange({ min: minDb, max: maxDb });
  }, [plot, minDb, maxDb]);

  useEffect(() => {
    smoothingRef.current = null;
    fftMetaRef.current = null;
    lastFrameTimestampRef.current = null;
    maxHoldRef.current = null;
    const trace = traceRef.current;
    if (trace) {
      trace.setXY(new Float32Array(0), new Float32Array(0));
      plot?.requestDraw();
    }
    maxHoldTraceRef.current?.setXY(new Float32Array(0), new Float32Array(0));
  }, [plot, dataKey]);

  useEffect(() => {
    if (!plot || plot.isDestroyed()) return;
    const handleFFTData = (event: Event) => {
      const customEvent = event as CustomEvent<FFTDataBatch>;
      const frames = customEvent.detail?.frames;
      if (!frames || frames.length === 0) {
        return;
      }
      const incomingFFT = frames[frames.length - 1];
      const bins = incomingFFT.bins;
      if (!bins.length) {
        return;
      }

      const frameTimestamp = Number.isFinite(incomingFFT.timestamp)
        ? incomingFFT.timestamp
        : Date.now();
      const lastFrameTimestamp = lastFrameTimestampRef.current;
      const deltaSeconds =
        typeof lastFrameTimestamp === "number"
          ? Math.max((frameTimestamp - lastFrameTimestamp) / 1000, 0)
          : 0;
      lastFrameTimestampRef.current = frameTimestamp;

      let smoothed = smoothingRef.current;
      if (!smoothed || smoothed.length !== bins.length) {
        smoothed = new Float32Array(bins);
      } else {
        for (let i = 0; i < bins.length; i += 1) {
          smoothed[i] =
            smoothed[i] * FFT_SMOOTHING_FACTOR +
            bins[i] * (1 - FFT_SMOOTHING_FACTOR);
        }
      }
      smoothingRef.current = smoothed;
      const maxHoldDecayPerSecond = Math.min(
        Math.max(FFT_PERSISTENCE_CONFIG.maxHoldDecay, Number.EPSILON),
        1
      );
      const frameDecay =
        deltaSeconds > 0 ? Math.pow(maxHoldDecayPerSecond, deltaSeconds) : 1;
      const maxHoldDecayDb = frameDecay === 1 ? 0 : 10 * Math.log10(frameDecay);
      let maxHold = maxHoldRef.current;
      if (!maxHold || maxHold.length !== smoothed.length) {
        maxHold = new Float32Array(smoothed);
      } else {
        for (let i = 0; i < smoothed.length; i += 1) {
          const decayedValue =
            maxHoldDecayDb === 0 ? maxHold[i] : maxHold[i] + maxHoldDecayDb;
          maxHold[i] = Math.max(decayedValue, smoothed[i]);
        }
      }
      maxHoldRef.current = maxHold;
      fftMetaRef.current = {
        sampleRate: incomingFFT.sampleRate,
        centerFreq: incomingFFT.centerFreq,
      };

      const trace = traceRef.current;
      if (!trace) {
        return;
      }

      const sampleRate = incomingFFT.sampleRate;
      const centerFreq = incomingFFT.centerFreq;
      const binCount = smoothed.length;
      if (!binCount) {
        return;
      }

      const binWidth = sampleRate / binCount;
      const fftStart = centerFreq - sampleRate / 2;
      const { startFreq, endFreq } = frequencyRange;
      let startBin = Math.floor((startFreq - fftStart) / binWidth);
      let endBin = Math.ceil((endFreq - fftStart) / binWidth);
      startBin = Math.max(0, Math.min(binCount - 1, startBin));
      endBin = Math.max(startBin + 1, Math.min(binCount, endBin));

      const rangeBinCount = endBin - startBin;
      const maxPoints = Math.min(MAX_POINTS, Math.max(1, rangeBinCount));
      const buffers = getLineBuffers(lineBuffersRef);
      const { freqs, powers, binIndices, sample } = buffers;
      const step = maxPoints > 1 ? (rangeBinCount - 1) / (maxPoints - 1) : 0;

      for (let i = 0; i < maxPoints; i += 1) {
        const offset = maxPoints > 1 ? Math.round(i * step) : 0;
        const binIndex = Math.min(rangeBinCount - 1, offset) + startBin;
        const freq = fftStart + binIndex * binWidth;
        const power = smoothed[binIndex];
        binIndices[i] = binIndex;
        if (!Number.isFinite(power)) {
          freqs[i] = Number.NaN;
          powers[i] = Number.NaN;
          continue;
        }
        freqs[i] = freq;
        powers[i] = power;
      }

      const sampleLine = (source: Float32Array | null) => {
        if (!source) return null;
        for (let i = 0; i < maxPoints; i += 1) {
          const binIndex = binIndices[i];
          const value = source[binIndex];
          sample[i] = Number.isFinite(value) ? value : Number.NaN;
        }
        return sample;
      };

      const freqView =
        maxPoints === MAX_POINTS ? freqs : freqs.subarray(0, maxPoints);
      const powerView =
        maxPoints === MAX_POINTS ? powers : powers.subarray(0, maxPoints);

      trace.setXY(freqView, powerView);

      const maxHoldLine = maxHoldTraceRef.current;
      const maxHoldSampled = sampleLine(maxHoldRef.current);
      if (maxHoldLine) {
        if (maxHoldSampled) {
          const maxHoldView =
            maxPoints === MAX_POINTS
              ? maxHoldSampled
              : maxHoldSampled.subarray(0, maxPoints);
          maxHoldLine.setXY(freqView, maxHoldView);
        } else {
          maxHoldLine.setXY(new Float32Array(0), new Float32Array(0));
        }
      }

      plot.requestDraw();
    };

    const eventName = "fft-data";
    window.addEventListener(eventName, handleFFTData);
    return () => window.removeEventListener(eventName, handleFFTData);
  }, [plot, frequencyRange]);

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        overflow: "hidden",
      }}
    >
      <canvas
        ref={handleCanvasAttach}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
      {cursorInfo && (
        <div
          style={{
            position: "absolute",
            left: Math.min(Math.max(cursorInfo.canvasX + 16, 8), width - 140),
            top: Math.min(Math.max(cursorInfo.canvasY - 32, 8), height - 48),
            background: vizTheme.tooltipBackground,
            border: `1px solid ${vizTheme.tooltipBorder}`,
            borderRadius: 2,
            padding: "4px 8px",
            color: vizTheme.tooltipText,
            fontSize: 11,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 2,
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          }}
        >
          <div>{formatFrequency(cursorInfo.dataX)}</div>
          <div>{cursorInfo.dataY.toFixed(1)}</div>
        </div>
      )}
    </div>
  );
});
