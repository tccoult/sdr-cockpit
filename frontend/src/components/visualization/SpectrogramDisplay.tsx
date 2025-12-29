import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePlotRenderFps } from "../../hooks";
import type {
  CursorState,
  HeatmapLayerHandle,
  PlotCreationOptions,
} from "../../plot";
import { usePlot } from "../../plot";
import { FFTDataBatch, FrequencyRange } from "../../types/sdr";
import { buildColorLUT, type ColorMap } from "../../utils/colorMaps";
import { formatFrequency } from "../../utils/formatters";
import type { Theme } from "../app/theme-context";
import type { InteractionMode } from "./VisualizationControls";
import { getVisualizationTheme, toPlotTheme } from "../../styles/theme";

interface SpectrogramDisplayProps {
  width: number;
  height: number;
  colorMap: ColorMap;
  minDb: number;
  maxDb: number;
  frequencyRange: FrequencyRange;
  onFrequencyRangeChange?: (range: FrequencyRange) => void;
  dataKey?: string;
  theme: Theme;
  onRenderFpsChange?: (fps: number) => void;
  interactionMode: InteractionMode;
}

export const SpectrogramDisplay = memo(function SpectrogramDisplay({
  width,
  height,
  colorMap,
  minDb,
  maxDb,
  frequencyRange,
  onFrequencyRangeChange,
  dataKey,
  theme,
  onRenderFpsChange,
  interactionMode,
}: SpectrogramDisplayProps) {
  const isDark = theme === "dark";
  const vizTheme = useMemo(() => getVisualizationTheme(isDark), [isDark]);
  const plotTheme = useMemo(() => toPlotTheme(vizTheme), [vizTheme]);

  const plotOptions = useMemo<PlotCreationOptions>(
    () => ({
      background: plotTheme.background,
      theme: plotTheme,
      interactions: {
        pan: { x: true, y: true },
        zoom: { x: true, y: true, factor: 0.2 },
        cursor: { enabled: true, style: "crosshair" },
        boxZoom: { mode: "xy", modifier: "shift" },
      },
      axes: {
        x: {
          label: "Frequency (Hz)",
          formatter: (value: number) => formatFrequency(value, true),
          ticksTarget: 8,
        },
        y: {
          label: "Time",
          ticksTarget: 6,
        },
      },
    }),
    [plotTheme]
  );

  const { plot, attachCanvas } = usePlot(plotOptions);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const heatmapRef = useRef<HeatmapLayerHandle | null>(null);
  const [cursorInfo, setCursorInfo] = useState<CursorState | null>(null);
  const frameCountRef = useRef(0);
  const timestampsRef = useRef<Float64Array | null>(null);
  const renderFps = usePlotRenderFps(plot);
  const colormap = useMemo(() => buildColorLUT(colorMap), [colorMap]);

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
    if (!plot) return;
    const modifier = interactionMode === "zoom" ? "none" : "shift";
    plot.setBoxZoomModifier(modifier);
  }, [plot, interactionMode]);

  useEffect(() => {
    if (!plot) return;
    plot.setXRange({
      min: frequencyRange.startFreq,
      max: frequencyRange.endFreq,
    });
  }, [plot, frequencyRange.endFreq, frequencyRange.startFreq]);

  useEffect(() => {
    if (!plot || !onFrequencyRangeChange) return;
    const unsubscribeZoom = plot.onZoom((axis, range) => {
      if (axis !== "x") return;
      onFrequencyRangeChange({ startFreq: range.min, endFreq: range.max });
    });
    const unsubscribePan = plot.onPan((axis, range) => {
      if (axis !== "x") return;
      onFrequencyRangeChange({ startFreq: range.min, endFreq: range.max });
    });
    return () => {
      unsubscribeZoom?.();
      unsubscribePan?.();
    };
  }, [plot, onFrequencyRangeChange]);

  useEffect(() => {
    if (!plot) return;
    const unsubscribe = plot.onCursor((cursor) => setCursorInfo(cursor));
    return unsubscribe;
  }, [plot]);

  useEffect(() => {
    heatmapRef.current?.setClip({ min: minDb, max: maxDb });
  }, [minDb, maxDb]);

  useEffect(() => {
    if (!plot) return;
    return () => {
      heatmapRef.current?.remove();
      heatmapRef.current = null;
      timestampsRef.current = null;
      frameCountRef.current = 0;
    };
  }, [plot]);

  useEffect(() => {
    if (!plot) return;
    heatmapRef.current?.remove();
    heatmapRef.current = null;
    timestampsRef.current = null;
    frameCountRef.current = 0;
  }, [plot, dataKey, colormap]);

  useEffect(() => {
    if (!plot) return;

    const handleFFTData = (event: Event) => {
      const customEvent = event as CustomEvent<FFTDataBatch>;
      const frames = customEvent.detail?.frames;
      if (!frames || frames.length === 0) {
        return;
      }

      const firstFrame = frames[0];
      if (!firstFrame || firstFrame.bins.length === 0) {
        return;
      }

      const binCount = firstFrame.bins.length;
      const frameCount = frames.length;
      const data: number[][] = [];
      for (const frame of frames) {
        data.push(Array.from(frame.bins));
      }

      heatmapRef.current?.remove();
      const halfSpan = firstFrame.sampleRate / 2;
      const domainMin = firstFrame.centerFreq - halfSpan;
      const domainMax = firstFrame.centerFreq + halfSpan;
      const layer = plot.addHeatmap({
        width: binCount,
        height: frameCount,
        colormap,
        clip: { min: minDb, max: maxDb },
        domain: {
          x: { min: domainMin, max: domainMax },
          y: { min: 0, max: frameCount },
        },
      });

      layer.setFullImage(data);
      heatmapRef.current = layer;
      frameCountRef.current = frameCount;
      const tsArray = new Float64Array(frameCount);
      for (let i = 0; i < frameCount; i += 1) {
        tsArray[i] = frames[i].timestamp ?? Number.NaN;
      }
      timestampsRef.current = tsArray;
      plot.setYRange({ min: 0, max: Math.max(1, frameCount) });
      plot.requestDraw();
    };

    window.addEventListener("fft-data", handleFFTData);
    return () => {
      window.removeEventListener("fft-data", handleFFTData);
    };
  }, [plot, colormap, minDb, maxDb, dataKey]);

  useEffect(() => {
    if (!onRenderFpsChange) return;
    onRenderFpsChange(renderFps);
  }, [renderFps, onRenderFpsChange]);

  useEffect(() => {
    return () => {
      onRenderFpsChange?.(0);
    };
  }, [onRenderFpsChange]);

  // Tooltip computation reads refs during render - necessary for visualization overlays
  /* eslint-disable react-hooks/refs */
  let tooltip: { left: number; top: number; lines: string[] } | null = null;
  if (cursorInfo && canvasRef.current) {
    const freqLabel = formatFrequency(cursorInfo.dataX);
    const rawValue =
      cursorInfo.values && cursorInfo.values.length > 0
        ? cursorInfo.values[cursorInfo.values.length - 1]
        : undefined;
    const intensityMatch =
      rawValue !== undefined ? rawValue.match(/-?\d+(?:\.\d+)?/) : null;
    const intensity =
      intensityMatch !== null ? Number.parseFloat(intensityMatch[0]) : NaN;
    const timestamps = timestampsRef.current;
    let timeLabel: string | null = null;
    if (
      timestamps &&
      timestamps.length > 0 &&
      Number.isFinite(cursorInfo.dataY)
    ) {
      const frameCount = frameCountRef.current || timestamps.length;
      const domainYMax = frameCount;
      const domainSpan = domainYMax || 1;
      const normalizedFromTop =
        (domainYMax - cursorInfo.dataY) / (domainSpan || 1);
      const clamped = Math.min(Math.max(normalizedFromTop, 0), 0.999999);
      const rowIndex = Math.min(
        frameCount - 1,
        Math.max(0, Math.floor(clamped * frameCount))
      );
      const ts = timestamps[rowIndex];
      const anchor = timestamps[0];
      if (Number.isFinite(ts) && Number.isFinite(anchor)) {
        const delta = (ts - anchor) / 1000;
        const sign = delta >= 0 ? "+" : "-";
        timeLabel = `${sign}${Math.abs(delta).toFixed(1)}s`;
      }
    }

    const lines: string[] = [freqLabel];
    if (timeLabel) {
      lines.push(timeLabel);
    }
    if (Number.isFinite(intensity)) {
      lines.push(intensity.toFixed(1));
    }

    if (lines.length > 0) {
      const tooltipLeft = Math.min(
        Math.max(cursorInfo.canvasX + 16, 8),
        width - 140
      );
      const tooltipTop = Math.min(
        Math.max(cursorInfo.canvasY - 32, 8),
        height - 48
      );
      tooltip = {
        left: tooltipLeft,
        top: tooltipTop,
        lines,
      };
    }
  }
  /* eslint-enable react-hooks/refs */

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
        width={width}
        height={height}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
      {tooltip && (
        <div
          style={{
            position: "absolute",
            left: tooltip.left,
            top: tooltip.top,
            background: vizTheme.tooltipBackground,
            color: vizTheme.tooltipText,
            border: "1px solid rgba(15,23,42,0.2)",
            borderRadius: 2,
            padding: "4px 8px",
            fontSize: 11,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 2,
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          }}
        >
          {tooltip.lines.map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
});
