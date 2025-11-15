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
import { FFT_SETTINGS_CONFIG, FFT_SMOOTHING_FACTOR } from "./FFTSettings";
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
  maxHoldEnabled: boolean;
  maxHoldClearKey: number;
}

const MAX_POINTS = 1024;
const PERSISTENCE_ENABLED = FFT_SETTINGS_CONFIG.persistenceEnabled !== false;
const PERSISTENCE_INTERVAL_MS =
  FFT_SETTINGS_CONFIG.persistenceTargetFps &&
  FFT_SETTINGS_CONFIG.persistenceTargetFps > 0
    ? 1000 / FFT_SETTINGS_CONFIG.persistenceTargetFps
    : 0;
const MAX_HOLD_INTERVAL_MS =
  FFT_SETTINGS_CONFIG.maxHoldTargetFps &&
  FFT_SETTINGS_CONFIG.maxHoldTargetFps > 0
    ? 1000 / FFT_SETTINGS_CONFIG.maxHoldTargetFps
    : 0;

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
  maxHoldEnabled,
  maxHoldClearKey,
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
  const persistenceTraceRef = useRef<LineLayerHandle | null>(null);
  const maxHoldTraceRef = useRef<LineLayerHandle | null>(null);
  const smoothingRef = useRef<Float32Array | null>(null);
  const lineBuffersRef = useRef<LineBuffers | null>(null);
  const persistenceRef = useRef<Float32Array | null>(null);
  const maxHoldRef = useRef<Float32Array | null>(null);
  const fftMetaRef = useRef<{ sampleRate: number; centerFreq: number } | null>(
    null
  );
  const lastFrameTimestampRef = useRef<number | null>(null);
  const lastPersistenceDrawRef = useRef<number>(0);
  const lastMaxHoldDrawRef = useRef<number>(0);
  const maxHoldEnabledRef = useRef(maxHoldEnabled);
  const [cursorInfo, setCursorInfo] = useState<CursorState | null>(null);
  const renderFps = usePlotRenderFps(plot);

  useEffect(() => {
    maxHoldEnabledRef.current = maxHoldEnabled;
  }, [maxHoldEnabled]);

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
      persistenceTraceRef.current?.remove();
      persistenceTraceRef.current = null;
    };

    cleanupHandles();

    if (PERSISTENCE_ENABLED) {
      const persistenceLine = plot.addLine({
        color: vizTheme.persistenceColor,
        lineWidth: FFT_SETTINGS_CONFIG.persistenceLineWidth,
        opacity: FFT_SETTINGS_CONFIG.persistenceOpacity,
        surface: "data:persistence",
      });
      persistenceTraceRef.current = persistenceLine;
    } else {
      persistenceTraceRef.current = null;
    }

    const currentLine = plot.addLine({
      color: vizTheme.traceColor,
      lineWidth: FFT_SETTINGS_CONFIG.liveTraceLineWidth,
    });
    traceRef.current = currentLine;

    return cleanupHandles;
  }, [plot, vizTheme]);

  useEffect(() => {
    if (!plot || plot.isDestroyed()) return;
    maxHoldTraceRef.current?.remove();
    maxHoldTraceRef.current = null;
    if (!maxHoldEnabled) {
      maxHoldRef.current = null;
      return;
    }

    const maxHoldLine = plot.addLine({
      color: vizTheme.maxHoldColor,
      lineWidth: FFT_SETTINGS_CONFIG.maxHoldLineWidth,
      opacity: FFT_SETTINGS_CONFIG.maxHoldOpacity,
      surface: "data:maxHold",
    });
    maxHoldTraceRef.current = maxHoldLine;

    return () => {
      maxHoldLine.remove();
      if (maxHoldTraceRef.current === maxHoldLine) {
        maxHoldTraceRef.current = null;
      }
    };
  }, [plot, vizTheme, maxHoldEnabled]);

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
    if (maxHoldEnabled) {
      return;
    }
    maxHoldRef.current = null;
    maxHoldTraceRef.current?.setXY(new Float32Array(0), new Float32Array(0));
    lastMaxHoldDrawRef.current = 0;
  }, [maxHoldEnabled]);

  useEffect(() => {
    maxHoldRef.current = null;
    maxHoldTraceRef.current?.setXY(new Float32Array(0), new Float32Array(0));
    lastMaxHoldDrawRef.current = 0;
  }, [maxHoldClearKey]);

  useEffect(() => {
    smoothingRef.current = null;
    fftMetaRef.current = null;
    lastFrameTimestampRef.current = null;
    lastPersistenceDrawRef.current = 0;
    lastMaxHoldDrawRef.current = 0;
    persistenceRef.current = null;
    const trace = traceRef.current;
    if (trace) {
      trace.setXY(new Float32Array(0), new Float32Array(0));
      plot?.requestDraw();
    }
    persistenceTraceRef.current?.setXY(
      new Float32Array(0),
      new Float32Array(0)
    );
    maxHoldRef.current = null;
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
      const nowTs =
        typeof performance !== "undefined" &&
        typeof performance.now === "function"
          ? performance.now()
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
      if (PERSISTENCE_ENABLED) {
        const persistenceDecayPerSecond = Math.min(
          Math.max(FFT_SETTINGS_CONFIG.persistenceDecay, Number.EPSILON),
          1
        );
        const frameDecay =
          deltaSeconds > 0
            ? Math.pow(persistenceDecayPerSecond, deltaSeconds)
            : 1;
        const persistenceDecayDb =
          frameDecay === 1 ? 0 : 10 * Math.log10(frameDecay);
        let persistence = persistenceRef.current;
        if (!persistence || persistence.length !== smoothed.length) {
          persistence = new Float32Array(smoothed);
        } else {
          for (let i = 0; i < smoothed.length; i += 1) {
            const decayedValue =
              persistenceDecayDb === 0
                ? persistence[i]
                : persistence[i] + persistenceDecayDb;
            persistence[i] = Math.max(decayedValue, smoothed[i]);
          }
        }
        persistenceRef.current = persistence;
      } else {
        persistenceRef.current = null;
      }
      if (maxHoldEnabledRef.current) {
        let maxHold = maxHoldRef.current;
        if (!maxHold || maxHold.length !== smoothed.length) {
          maxHold = new Float32Array(smoothed);
        } else {
          for (let i = 0; i < smoothed.length; i += 1) {
            const nextValue = smoothed[i];
            if (!Number.isFinite(nextValue)) continue;
            const currentValue = maxHold[i];
            if (!Number.isFinite(currentValue) || nextValue > currentValue) {
              maxHold[i] = nextValue;
            }
          }
        }
        maxHoldRef.current = maxHold;
      } else {
        maxHoldRef.current = null;
      }
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

      if (PERSISTENCE_ENABLED) {
        const persistenceLine = persistenceTraceRef.current;
        const persistenceSampled = sampleLine(persistenceRef.current);
        if (persistenceLine) {
          const sinceLast = nowTs - (lastPersistenceDrawRef.current || 0);
          const shouldUpdate =
            PERSISTENCE_INTERVAL_MS === 0 ||
            sinceLast >= PERSISTENCE_INTERVAL_MS;
          const shouldClear = !persistenceSampled;
          if (shouldUpdate || shouldClear) {
            if (persistenceSampled) {
              const persistenceView =
                maxPoints === MAX_POINTS
                  ? persistenceSampled
                  : persistenceSampled.subarray(0, maxPoints);
              persistenceLine.setXY(freqView, persistenceView);
            } else {
              persistenceLine.setXY(new Float32Array(0), new Float32Array(0));
            }
            lastPersistenceDrawRef.current = nowTs;
          }
        }
      }
      if (maxHoldEnabledRef.current) {
        const maxHoldLine = maxHoldTraceRef.current;
        const maxHoldSampled = sampleLine(maxHoldRef.current);
        if (maxHoldLine) {
          const sinceLast = nowTs - (lastMaxHoldDrawRef.current || 0);
          const shouldUpdate =
            MAX_HOLD_INTERVAL_MS === 0 || sinceLast >= MAX_HOLD_INTERVAL_MS;
          const shouldClear = !maxHoldSampled;
          if (shouldUpdate || shouldClear) {
            if (maxHoldSampled) {
              const maxHoldView =
                maxPoints === MAX_POINTS
                  ? maxHoldSampled
                  : maxHoldSampled.subarray(0, maxPoints);
              maxHoldLine.setXY(freqView, maxHoldView);
            } else {
              maxHoldLine.setXY(new Float32Array(0), new Float32Array(0));
            }
            lastMaxHoldDrawRef.current = nowTs;
          }
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
