import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FFTDataBatch, FrequencyRange } from "../../types/sdr";
import { formatFrequency } from "../../utils/formatters";
import {
  usePlot,
  type CursorState,
  type LineLayerHandle,
  type PlotCreationOptions,
} from "../../plot";
import { usePlotRenderFps } from "../../hooks";
import type { Theme } from "../app/theme-context";

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
}

const SMOOTHING_FACTOR = 0.95;
const MAX_POINTS = 2048;

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
}: FFTDisplayProps) {
  const isDark = theme === "dark";

  const plotColors = useMemo(() => {
    if (isDark) {
      return {
        background: "rgba(10, 10, 15, 0.85)",
        gridColor: "rgba(255, 255, 255, 0.12)",
        textColor: "#ffffff",
        axisColor: "rgba(255, 255, 255, 0.4)",
        traceColor: "#FF00FF",
        tooltipBackground: "rgba(20, 20, 30, 0.95)",
        tooltipBorder: "rgba(255, 255, 255, 0.2)",
        tooltipText: "#ffffff",
      };
    }
    return {
      background: "rgba(245, 245, 250, 0.95)",
      gridColor: "rgba(0, 0, 0, 0.08)",
      textColor: "#1e293b",
      axisColor: "rgba(51, 65, 85, 0.8)",
      traceColor: "#8b5cf6",
      tooltipBackground: "rgba(255, 255, 255, 0.95)",
      tooltipBorder: "rgba(0, 0, 0, 0.2)",
      tooltipText: "#1e293b",
    };
  }, [isDark]);

  const plotOptions = useMemo<PlotCreationOptions>(
    () => ({
      background: plotColors.background,
      theme: {
        gridColor: plotColors.gridColor,
        textColor: plotColors.textColor,
        axisColor: plotColors.axisColor,
        cursorLineColor: plotColors.textColor,
        cursorHighlightColor: plotColors.traceColor,
      },
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
    [plotColors]
  );

  const { plot, attachCanvas } = usePlot(plotOptions);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const traceRef = useRef<LineLayerHandle | null>(null);
  const smoothingRef = useRef<Float32Array | null>(null);
  const fftMetaRef = useRef<{ sampleRate: number; centerFreq: number } | null>(
    null
  );
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
    const line = plot.addLine({
      color: plotColors.traceColor,
      lineWidth: 2,
    });
    traceRef.current = line;
    return () => {
      line.remove();
      traceRef.current = null;
    };
  }, [plot, plotColors.traceColor]);

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
    const trace = traceRef.current;
    if (trace) {
      trace.setXY(new Float32Array(0), new Float32Array(0));
      plot?.requestDraw();
    }
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

      let smoothed = smoothingRef.current;
      if (!smoothed || smoothed.length !== bins.length) {
        smoothed = new Float32Array(bins);
      } else {
        for (let i = 0; i < bins.length; i += 1) {
          smoothed[i] =
            smoothed[i] * SMOOTHING_FACTOR + bins[i] * (1 - SMOOTHING_FACTOR);
        }
      }
      smoothingRef.current = smoothed;
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
      const freqs = new Float32Array(maxPoints);
      const powers = new Float32Array(maxPoints);
      const step = maxPoints > 1 ? (rangeBinCount - 1) / (maxPoints - 1) : 0;

      for (let i = 0; i < maxPoints; i += 1) {
        const offset = maxPoints > 1 ? Math.round(i * step) : 0;
        const binIndex = Math.min(rangeBinCount - 1, offset) + startBin;
        const freq = fftStart + binIndex * binWidth;
        const power = smoothed[binIndex];
        if (!Number.isFinite(power)) {
          freqs[i] = Number.NaN;
          powers[i] = Number.NaN;
          continue;
        }
        freqs[i] = freq;
        powers[i] = power;
      }

      trace.setXY(freqs, powers);
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
        background: plotColors.background,
        borderRadius: 4,
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
            background: plotColors.tooltipBackground,
            border: `1px solid ${plotColors.tooltipBorder}`,
            borderRadius: 4,
            padding: "4px 8px",
            color: plotColors.tooltipText,
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
