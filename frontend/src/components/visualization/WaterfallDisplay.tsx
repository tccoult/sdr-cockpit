import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import type { HeatmapLayerHandle, PlotCreationOptions } from "../../plot";
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
        zoom: { x: true, y: false, factor: 0.2 },
        cursor: { enabled: false },
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
    canvas.style.cursor = "crosshair";
  }, [isDark]);

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
    heatmapRef.current?.setClip({ min: minDb, max: maxDb });
  }, [minDb, maxDb]);

  useEffect(() => {
    return () => {
      heatmapRef.current?.remove();
      heatmapRef.current = null;
      heatmapInfoRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!plot) return;
    heatmapRef.current?.remove();
    heatmapRef.current = null;
    heatmapInfoRef.current = null;
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
      });
      heatmapRef.current = layer;
      heatmapInfoRef.current = { width: widthBins, height: rowCount };
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
    };

    window.addEventListener("fft-data", handleFFTData);
    return () => {
      window.removeEventListener("fft-data", handleFFTData);
    };
  }, [plot, colormap, minDb, maxDb, rowCount]);

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
