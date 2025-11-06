import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CursorState,
  HeatmapLayerHandle,
  PlotCreationOptions,
} from "../../plot";
import { usePlot } from "../../plot";
import { FFTData, FrequencyRange } from "../../types/sdr";
import { buildColorLUT, type ColorMap } from "../../utils/colorMaps";
import { formatFrequency } from "../../utils/formatters";
import type { Theme } from "../app/theme-context";

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
}: WaterfallDisplayProps) {
  const isDark = theme === "dark";

  const waterfallColors = useMemo(() => {
    if (isDark) {
      return {
        background: "rgba(10, 10, 15, 0.95)",
        axisColor: "rgba(255, 255, 255, 0.4)",
        textColor: "rgba(255, 255, 255, 0.85)",
        gridColor: "rgba(255, 255, 255, 0.08)",
        scaleBackground: "rgba(0, 0, 0, 0.7)",
        scaleText: "#ffffff",
      };
    }
    return {
      background: "rgba(245, 245, 250, 0.95)",
      axisColor: "rgba(51, 65, 85, 0.6)",
      textColor: "#1e293b",
      gridColor: "rgba(15, 23, 42, 0.08)",
      scaleBackground: "rgba(255, 255, 255, 0.7)",
      scaleText: "#1e293b",
    };
  }, [isDark]);

  const plotOptions = useMemo<PlotCreationOptions>(
    () => ({
      background: waterfallColors.background,
      theme: {
        background: waterfallColors.background,
        axisColor: waterfallColors.axisColor,
        textColor: waterfallColors.textColor,
        gridColor: waterfallColors.gridColor,
        cursorLineColor: waterfallColors.textColor,
        cursorHighlightColor: waterfallColors.textColor,
      },
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
    [waterfallColors]
  );

  const { plot, attachCanvas } = usePlot(plotOptions);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const heatmapRef = useRef<HeatmapLayerHandle | null>(null);
  const heatmapInfoRef = useRef<{ width: number; height: number } | null>(null);
  const fftMetaRef = useRef<{ sampleRate: number; centerFreq: number } | null>(
    null
  );
  const rowTimestampsRef = useRef<Float64Array | null>(null);
  const rowHeadRef = useRef<number>(0);
  const rowsFilledRef = useRef<number>(0);
  const [cursorInfo, setCursorInfo] = useState<CursorState | null>(null);

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
    plot.setXRange({
      min: frequencyRange.startFreq,
      max: frequencyRange.endFreq,
    });
  }, [plot, frequencyRange.endFreq, frequencyRange.startFreq]);

  useEffect(() => {
    if (!plot) return;
    plot.setYRange({ min: 0, max: rowCount });
  }, [plot, rowCount]);

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
    const heatmap = heatmapRef.current;
    if (!heatmap) return;
    heatmap.setDomain({
      x: { min: frequencyRange.startFreq, max: frequencyRange.endFreq },
    });
  }, [frequencyRange.startFreq, frequencyRange.endFreq]);

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
          x: { min: frequencyRange.startFreq, max: frequencyRange.endFreq },
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
      const customEvent = event as CustomEvent<FFTData>;
      const frame = customEvent.detail;
      if (!frame || frame.bins.length === 0) {
        return;
      }
      fftMetaRef.current = {
        centerFreq: frame.centerFreq,
        sampleRate: frame.sampleRate,
      };
      const heatmap = ensureHeatmap(frame.bins.length);
      heatmap.pushRow(frame.bins);
      heatmap.setDomain({
        x: { min: frequencyRange.startFreq, max: frequencyRange.endFreq },
      });
      if (
        !rowTimestampsRef.current ||
        rowTimestampsRef.current.length !== rowCount
      ) {
        rowTimestampsRef.current = new Float64Array(rowCount).fill(Number.NaN);
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
    };

    window.addEventListener("fft-data", handleFFTData);
    return () => {
      window.removeEventListener("fft-data", handleFFTData);
    };
  }, [plot, colormap, minDb, maxDb, rowCount, frequencyRange.startFreq, frequencyRange.endFreq]);

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
      const relativeY = (cursorInfo.canvasY - rect.top) / rect.height;
      const timestamps = rowTimestampsRef.current;
      const rowsFilled = rowsFilledRef.current;
      let timeLabel: string | null = null;
      if (timestamps && rowsFilled > 0) {
        const clampedRelY = Math.min(Math.max(relativeY, 0), 0.999999);
        const displayRow = Math.min(
          rowCount - 1,
          Math.max(0, Math.floor(clampedRelY * rowCount))
        );
        if (displayRow < rowsFilled) {
          const bufferIndex =
            (rowHeadRef.current + displayRow) % rowCount;
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

  const leftFreq = formatFrequency(frequencyRange.startFreq);
  const midFreq = formatFrequency(
    (frequencyRange.startFreq + frequencyRange.endFreq) / 2
  );
  const rightFreq = formatFrequency(frequencyRange.endFreq);

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        background: waterfallColors.background,
        borderRadius: 4,
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
            background: waterfallColors.scaleBackground,
            color: waterfallColors.scaleText,
            border: "1px solid rgba(0,0,0,0.2)",
            borderRadius: 4,
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
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 24,
          background: waterfallColors.scaleBackground,
          color: waterfallColors.scaleText,
          fontSize: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 8px",
          pointerEvents: "none",
        }}
      >
        <span>{leftFreq}</span>
        <span>{midFreq}</span>
        <span>{rightFreq}</span>
      </div>
    </div>
  );
});
