/**
 * Main spectrum visualization combining FFT and waterfall displays
 * Provides synchronized zoom, pan, and controls
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FFTData, FrequencyRange } from "../../types/sdr";
import { ColorMap } from "../../utils/colorMaps";
import { formatFrequency } from "../../utils/formatters";
import { FFTDisplay } from "./FFTDisplay";
import { WaterfallDisplay } from "./WaterfallDisplay";
import { useTheme } from "../app/useTheme";
import { Button } from "../common/Button";

interface SpectrumViewProps {
  taskId: string;
  centerFreq: number; // Center frequency in Hz
  sampleRate: number; // Sample rate in Hz
  colorMap: ColorMap; // Selected color map
  availableHeight?: number;
}

export const SpectrumView = memo(function SpectrumView({
  taskId,
  centerFreq,
  sampleRate,
  colorMap,
  availableHeight,
}: SpectrumViewProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Display settings
  const plotAreaRef = useRef<HTMLDivElement>(null);
  const [plotSize, setPlotSize] = useState({ width: 0, height: 0 });
  const [minDb, setMinDb] = useState(-100);
  const [maxDb, setMaxDb] = useState(-20);
  const layout = useMemo(() => {
    const MIN_FFT_HEIGHT = 180;
    const MIN_WATERFALL_HEIGHT = 240;
    const MIN_TOTAL = MIN_FFT_HEIGHT + MIN_WATERFALL_HEIGHT;

    const available = plotSize.height;
    if (available <= 0) {
      return {
        fftHeight: MIN_FFT_HEIGHT,
        waterfallHeight: MIN_WATERFALL_HEIGHT,
      };
    }

    if (available >= MIN_TOTAL) {
      let fftHeight = Math.max(Math.round(available * 0.35), MIN_FFT_HEIGHT);
      let waterfallHeight = Math.max(available - fftHeight, MIN_WATERFALL_HEIGHT);

      if (waterfallHeight < MIN_WATERFALL_HEIGHT) {
        waterfallHeight = MIN_WATERFALL_HEIGHT;
        fftHeight = Math.max(available - waterfallHeight, MIN_FFT_HEIGHT);
      }

      if (fftHeight < MIN_FFT_HEIGHT) {
        fftHeight = MIN_FFT_HEIGHT;
        waterfallHeight = Math.max(available - fftHeight, MIN_WATERFALL_HEIGHT);
      }

      return { fftHeight, waterfallHeight };
    }

    const fftShare = MIN_FFT_HEIGHT / MIN_TOTAL;
    const fftHeight = Math.max(Math.round(available * fftShare), 0);
    const waterfallHeight = Math.max(available - fftHeight, 0);

    return { fftHeight, waterfallHeight };
  }, [plotSize.height]);

  // Frequency range state (shared between FFT and waterfall)
  const [frequencyRange, setFrequencyRange] = useState<FrequencyRange>({
    startFreq: centerFreq - sampleRate / 2,
    endFreq: centerFreq + sampleRate / 2,
  });

  // Store current FFT data for auto-ranging
  const currentFFTRef = useRef<FFTData | null>(null);
  useEffect(() => {
    currentFFTRef.current = null;
  }, [taskId]);

  // Listen to FFT data events to track current data
  useEffect(() => {
    const handleFFTData = (event: Event) => {
      const customEvent = event as CustomEvent<FFTData>;
      currentFFTRef.current = customEvent.detail;
    };

    window.addEventListener("fft-data", handleFFTData);
    return () => window.removeEventListener("fft-data", handleFFTData);
  }, []);

  // Auto range function
  const autoRange = useCallback(() => {
    // Reset frequency range to full spectrum
    setFrequencyRange({
      startFreq: centerFreq - sampleRate / 2,
      endFreq: centerFreq + sampleRate / 2,
    });

    // Auto range Y-axis based on current FFT data
    const fftData = currentFFTRef.current;
    if (fftData && fftData.bins.length > 0) {
      let min = Infinity;
      let max = -Infinity;

      // Find min/max power values in FFT data
      for (let i = 0; i < fftData.bins.length; i++) {
        const value = fftData.bins[i];
        if (isFinite(value)) {
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      }

      // Add padding (10% on each side)
      if (isFinite(min) && isFinite(max) && max > min) {
        const range = max - min;
        const padding = range * 0.1;
        setMinDb(Math.floor(min - padding));
        setMaxDb(Math.ceil(max + padding));
      }
    }
  }, [centerFreq, sampleRate]);

  // Auto range when task switches (centerFreq or sampleRate changes)
  useEffect(() => {
    autoRange();
  }, [centerFreq, sampleRate, autoRange]);

  // Handle frequency range changes (from zoom/pan)
  const handleFrequencyRangeChange = useCallback((newRange: FrequencyRange) => {
    setFrequencyRange(newRange);
  }, []);

  // Get container dimensions (responsive)

  useEffect(() => {
    const node = plotAreaRef.current;
    if (!node) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const { width, height } = entry.contentRect;
      setPlotSize((prev) => {
        const nextWidth = Math.max(width, 0);
        const nextHeight = Math.max(height, 0);
        if (
          Math.abs(prev.width - nextWidth) < 1 &&
          Math.abs(prev.height - nextHeight) < 1
        ) {
          return prev;
        }
        return { width: nextWidth, height: nextHeight };
      });
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const CARD_PADDING_X = 24; // px padding inside plot cards (p-3)
  const plotWidth = Math.max(plotSize.width - CARD_PADDING_X, 0);

  const containerClasses = [
    "flex flex-col gap-4 rounded-xl border p-4 md:p-6",
    isDark
      ? "border-white/10 bg-slate-950/60 text-slate-100 shadow-2xl shadow-black/40"
      : "border-slate-200 bg-white text-slate-900 shadow-xl shadow-slate-300/80",
  ].join(" ");

  const controlInputClasses = [
    "h-8 w-20 rounded-md border px-2 text-xs transition focus:outline-none focus-visible:ring-2",
    "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-cockpit-accent focus-visible:ring-cockpit-accent/40",
    "dark:border-white/20 dark:bg-slate-900/70 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-white/40 dark:focus-visible:ring-white/40",
  ].join(" ");

  return (
    <div
      className={`${containerClasses} flex h-full min-h-0 flex-col`}
      style={
        typeof availableHeight === "number" && availableHeight > 0
          ? { height: availableHeight }
          : undefined
      }
    >
      <div className="flex-none space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Spectrum Analyzer</h2>
            <div className="text-sm text-slate-500 dark:text-slate-300">
              Center: {formatFrequency(centerFreq)} · Sample Rate:{" "}
              {formatFrequency(sampleRate)}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <label htmlFor="min-db">Min dB:</label>
              <input
                id="min-db"
                type="number"
                value={minDb}
                onChange={(event) => setMinDb(Number(event.target.value))}
                className={controlInputClasses}
              />
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="max-db">Max dB:</label>
              <input
                id="max-db"
                type="number"
                value={maxDb}
                onChange={(event) => setMaxDb(Number(event.target.value))}
                className={controlInputClasses}
              />
            </div>

            <Button size="sm" variant="subtle" onClick={autoRange}>
              Auto Range
            </Button>
          </div>
        </div>
      </div>

      <div
        ref={plotAreaRef}
        className="flex flex-1 min-h-0 flex-col gap-4"
      >
        <div className="flex-none rounded-lg border border-slate-200 bg-white p-3 shadow-inner shadow-slate-200/60 dark:border-white/5 dark:bg-slate-900/40 dark:shadow-inner dark:shadow-black/40">
          <FFTDisplay
            width={plotWidth}
            height={layout.fftHeight}
            minDb={minDb}
            maxDb={maxDb}
            frequencyRange={frequencyRange}
            dataKey={taskId}
            onFrequencyRangeChange={handleFrequencyRangeChange}
          />
        </div>

        <div className="flex-none rounded-lg border border-slate-200 bg-white p-3 shadow-inner shadow-slate-200/60 dark:border-white/5 dark:bg-slate-900/40 dark:shadow-inner dark:shadow-black/40">
          <WaterfallDisplay
            width={plotWidth}
            height={layout.waterfallHeight}
            colorMap={colorMap}
            minDb={minDb}
            maxDb={maxDb}
            frequencyRange={frequencyRange}
            dataKey={taskId}
            onFrequencyRangeChange={handleFrequencyRangeChange}
          />
        </div>
      </div>

      <div
        className={[
          "mt-4 flex-none rounded-lg border p-3 text-xs",
          isDark
            ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-100"
            : "border-cyan-500/30 bg-cyan-50 text-cyan-800",
        ].join(" ")}
      >
        <strong className="font-semibold">Controls:</strong> Mouse wheel to zoom ·
        Click and drag to pan ·{" "}
        <strong className="font-semibold">Shift+Drag</strong> on FFT to zoom to range
      </div>
    </div>
  );
});
