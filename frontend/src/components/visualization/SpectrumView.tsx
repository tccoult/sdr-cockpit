/**
 * Main spectrum visualization combining FFT and waterfall displays
 * Provides synchronized zoom, pan, and controls
 */

import { memo, useCallback, useEffect, useRef, useState } from "react";
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
}

export const SpectrumView = memo(function SpectrumView({
  taskId,
  centerFreq,
  sampleRate,
  colorMap,
}: SpectrumViewProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const containerRef = useRef<HTMLDivElement>(null);
  const fftContainerRef = useRef<HTMLDivElement>(null);
  const waterfallContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [fftHeight, setFftHeight] = useState(220);
  const [waterfallHeight, setWaterfallHeight] = useState(320);
  const [minDb, setMinDb] = useState(-100);
  const [maxDb, setMaxDb] = useState(-20);

  const [frequencyRange, setFrequencyRange] = useState<FrequencyRange>({
    startFreq: centerFreq - sampleRate / 2,
    endFreq: centerFreq + sampleRate / 2,
  });

  const currentFFTRef = useRef<FFTData | null>(null);
  useEffect(() => {
    currentFFTRef.current = null;
  }, [taskId]);

  useEffect(() => {
    const handleFFTData = (event: Event) => {
      const customEvent = event as CustomEvent<FFTData>;
      currentFFTRef.current = customEvent.detail;
    };

    window.addEventListener("fft-data", handleFFTData);
    return () => window.removeEventListener("fft-data", handleFFTData);
  }, []);

  const autoRange = useCallback(() => {
    setFrequencyRange({
      startFreq: centerFreq - sampleRate / 2,
      endFreq: centerFreq + sampleRate / 2,
    });

    const fftData = currentFFTRef.current;
    if (fftData && fftData.bins.length > 0) {
      let min = Infinity;
      let max = -Infinity;

      for (let i = 0; i < fftData.bins.length; i += 1) {
        const value = fftData.bins[i];
        if (isFinite(value)) {
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      }

      if (isFinite(min) && isFinite(max) && max > min) {
        const range = max - min;
        const padding = range * 0.1;
        setMinDb(Math.floor(min - padding));
        setMaxDb(Math.ceil(max + padding));
      }
    }
  }, [centerFreq, sampleRate]);

  useEffect(() => {
    autoRange();
  }, [centerFreq, sampleRate, autoRange]);

  const handleFrequencyRangeChange = useCallback((newRange: FrequencyRange) => {
    setFrequencyRange(newRange);
  }, []);

  // Measure container width and plot container heights
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
      if (fftContainerRef.current) {
        setFftHeight(fftContainerRef.current.clientHeight);
      }
      if (waterfallContainerRef.current) {
        setWaterfallHeight(waterfallContainerRef.current.clientHeight);
      }
    });

    if (containerRef.current) observer.observe(containerRef.current);
    if (fftContainerRef.current) observer.observe(fftContainerRef.current);
    if (waterfallContainerRef.current) observer.observe(waterfallContainerRef.current);

    return () => observer.disconnect();
  }, []);

  const plotWidth = Math.max(containerWidth - 32, 0); // 32 for padding (16*2)

  const containerClasses = [
    "flex flex-1 flex-col gap-4 rounded-xl border p-4 md:p-6 min-h-0",
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
      ref={containerRef}
      className={containerClasses}
    >
      <div className="flex-none flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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

      <div
        ref={fftContainerRef}
        className="flex-[35] min-h-0 rounded-lg border border-slate-200 bg-white p-3 shadow-inner shadow-slate-200/60 dark:border-white/5 dark:bg-slate-900/40 dark:shadow-inner dark:shadow-black/40"
      >
        <FFTDisplay
          width={plotWidth}
          height={Math.max(fftHeight - 24, 180)}
          minDb={minDb}
          maxDb={maxDb}
          frequencyRange={frequencyRange}
          dataKey={taskId}
          onFrequencyRangeChange={handleFrequencyRangeChange}
          theme={theme}
        />
      </div>

      <div
        ref={waterfallContainerRef}
        className="flex-[65] min-h-0 rounded-lg border border-slate-200 bg-white p-3 shadow-inner shadow-slate-200/60 dark:border-white/5 dark:bg-slate-900/40 dark:shadow-inner dark:shadow-black/40"
      >
        <WaterfallDisplay
          width={plotWidth}
          height={Math.max(waterfallHeight - 24, 240)}
          colorMap={colorMap}
          minDb={minDb}
          maxDb={maxDb}
          frequencyRange={frequencyRange}
          dataKey={taskId}
          onFrequencyRangeChange={handleFrequencyRangeChange}
          theme={theme}
        />
      </div>

      <div
        className={[
          "flex-none rounded-lg border p-3 text-xs",
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
