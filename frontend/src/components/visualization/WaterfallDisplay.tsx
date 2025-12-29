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

interface WaterfallDisplayProps {
  width: number;
  height: number;
  colorMap: ColorMap;
  minDb: number;
  maxDb: number;
  frequencyRange: FrequencyRange;
  onFrequencyRangeChange?: (range: FrequencyRange) => void;
  dataKey?: string;
  theme: Theme;
  resetYKey?: number;
  onRenderFpsChange?: (fps: number) => void;
  interactionMode: InteractionMode;
}

const MIN_ROWS = 64;
const MAX_ROWS = 2048;

export const WaterfallDisplay = memo(function WaterfallDisplay({
  width,
  height,
  colorMap,
  minDb,
  maxDb,
  frequencyRange,
  onFrequencyRangeChange,
  dataKey,
  theme,
  resetYKey,
  onRenderFpsChange,
  interactionMode,
}: WaterfallDisplayProps) {
  const isDark = theme === "dark";
  const vizTheme = useMemo(() => getVisualizationTheme(isDark), [isDark]);
  const plotTheme = useMemo(() => toPlotTheme(vizTheme), [vizTheme]);

  const plotOptions = useMemo<PlotCreationOptions>(
    () => ({
      background: plotTheme.background,
      theme: plotTheme,
      interactions: {
        pan: { x: true, y: false },
        zoom: { x: true, y: true, factor: 0.2 },
        cursor: { enabled: true, style: "none" },
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
          formatter: () => "",
          ticksTarget: 4,
        },
      },
    }),
    [plotTheme]
  );

  const { plot, attachCanvas } = usePlot(plotOptions);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const heatmapRef = useRef<HeatmapLayerHandle | null>(null);
  const heatmapInfoRef = useRef<{ width: number; height: number } | null>(null);
  const rowTimestampsRef = useRef<Float64Array | null>(null);
  const rowHeadRef = useRef<number>(0);
  const rowsFilledRef = useRef<number>(0);
  const [cursorInfo, setCursorInfo] = useState<CursorState | null>(null);
  const renderFps = usePlotRenderFps(plot);

  const colormap = useMemo(() => buildColorLUT(colorMap), [colorMap]);
  const rowCount = useMemo(
    () => Math.max(MIN_ROWS, Math.min(MAX_ROWS, Math.floor(height))),
    [height]
  );

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
    if (!plot) return;
    plot.setYRange({ min: 0, max: rowCount });
  }, [plot, rowCount, resetYKey]);

  useEffect(() => {
    if (!plot || !onFrequencyRangeChange) {
      return;
    }
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
    const unsubscribe = plot.onCursor((cursor) => {
      setCursorInfo(cursor);
    });
    return unsubscribe;
  }, [plot]);

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
    heatmapRef.current?.setClip({ min: minDb, max: maxDb });
  }, [minDb, maxDb]);

  useEffect(() => {
    return () => {
      heatmapRef.current?.remove();
      heatmapRef.current = null;
      heatmapInfoRef.current = null;
      rowTimestampsRef.current = null;
      rowHeadRef.current = 0;
      rowsFilledRef.current = 0;
    };
  }, []);

  useEffect(() => {
    if (!plot) return;
    heatmapRef.current?.remove();
    heatmapRef.current = null;
    heatmapInfoRef.current = null;
    rowTimestampsRef.current = null;
    rowHeadRef.current = 0;
    rowsFilledRef.current = 0;
  }, [plot, dataKey, rowCount, colormap]);

  useEffect(() => {
    if (!plot) return;

    const ensureHeatmap = (widthBins: number) => {
      const existing = heatmapInfoRef.current;
      if (
        heatmapRef.current &&
        existing &&
        existing.width === widthBins &&
        existing.height === rowCount
      ) {
        return heatmapRef.current;
      }
      heatmapRef.current?.remove();
      const layer = plot.addHeatmap({
        width: widthBins,
        height: rowCount,
        colormap,
        clip: { min: minDb, max: maxDb },
        domain: {
          x: { min: 0, max: widthBins },
          y: { min: 0, max: rowCount },
        },
      });
      heatmapRef.current = layer;
      heatmapInfoRef.current = { width: widthBins, height: rowCount };
      rowTimestampsRef.current = new Float64Array(rowCount).fill(Number.NaN);
      rowHeadRef.current = 0;
      rowsFilledRef.current = 0;
      return layer;
    };

    const handleFFTData = (event: Event) => {
      const customEvent = event as CustomEvent<FFTDataBatch>;
      const frames = customEvent.detail?.frames;
      if (!frames || frames.length === 0) {
        return;
      }

      for (const frame of frames) {
        if (!frame || frame.bins.length === 0) {
          continue;
        }
        const heatmap = ensureHeatmap(frame.bins.length);
        heatmap.pushRow(frame.bins);
        const halfSpan = frame.sampleRate / 2;
        const dataMin = frame.centerFreq - halfSpan;
        const dataMax = frame.centerFreq + halfSpan;
        heatmap.setDomain({
          x: { min: dataMin, max: dataMax },
          y: { min: 0, max: rowCount },
        });
        if (
          !rowTimestampsRef.current ||
          rowTimestampsRef.current.length !== rowCount
        ) {
          rowTimestampsRef.current = new Float64Array(rowCount).fill(
            Number.NaN
          );
          rowHeadRef.current = 0;
          rowsFilledRef.current = 0;
        }
        rowHeadRef.current = (rowHeadRef.current - 1 + rowCount) % rowCount;
        if (rowTimestampsRef.current) {
          rowTimestampsRef.current[rowHeadRef.current] = frame.timestamp;
        }
        if (rowsFilledRef.current < rowCount) {
          rowsFilledRef.current += 1;
        }
      }
    };

    window.addEventListener("fft-data", handleFFTData);
    return () => {
      window.removeEventListener("fft-data", handleFFTData);
    };
  }, [plot, colormap, minDb, maxDb, rowCount]);

  // Tooltip computation reads refs during render - necessary for visualization overlays
  /* eslint-disable react-hooks/refs */
  let waterfallTooltip: { left: number; top: number; lines: string[] } | null =
    null;
  if (cursorInfo && canvasRef.current && rowCount > 0) {
    const rect = canvasRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const freqLabel = formatFrequency(cursorInfo.dataX);
      const rawValue =
        cursorInfo.values && cursorInfo.values.length > 0
          ? cursorInfo.values[cursorInfo.values.length - 1]
          : undefined;
      const intensityMatch =
        rawValue !== undefined ? rawValue.match(/-?\d+(?:\.\d+)?/) : null;
      const intensity =
        intensityMatch !== null ? Number.parseFloat(intensityMatch[0]) : NaN;
      const timestamps = rowTimestampsRef.current;
      const rowsFilled = rowsFilledRef.current;
      let timeLabel: string | null = null;
      let displayRow: number | null = null;
      if (Number.isFinite(cursorInfo.dataY)) {
        const domainYMax = rowCount;
        const domainYMin = 0;
        const domainSpan = domainYMax - domainYMin || 1;
        const normalizedFromTop = (domainYMax - cursorInfo.dataY) / domainSpan;
        const clamped = Math.min(Math.max(normalizedFromTop, 0), 0.999999);
        displayRow = Math.min(
          rowCount - 1,
          Math.max(0, Math.floor(clamped * rowCount))
        );
      }
      if (timestamps && rowsFilled > 0 && displayRow !== null) {
        if (displayRow < rowsFilled) {
          const bufferIndex = (rowHeadRef.current + displayRow) % rowCount;
          const ts = timestamps[bufferIndex];
          const newestTs = timestamps[rowHeadRef.current];
          if (Number.isFinite(ts) && Number.isFinite(newestTs)) {
            const delta = (newestTs - ts) / 1000;
            if (Math.abs(delta) < 0.05) {
              timeLabel = "0.0s";
            } else if (delta >= 0) {
              timeLabel = `+${delta.toFixed(1)}s`;
            }
          }
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
        waterfallTooltip = {
          left: tooltipLeft,
          top: tooltipTop,
          lines,
        };
      }
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
      {waterfallTooltip && (
        <div
          style={{
            position: "absolute",
            left: waterfallTooltip.left,
            top: waterfallTooltip.top,
            background: vizTheme.scaleBackground,
            color: vizTheme.scaleText,
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
          {waterfallTooltip.lines.map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
});
