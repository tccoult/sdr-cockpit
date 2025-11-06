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
  dataError?: string; // Optional error message when data can't be retrieved
  isConnecting?: boolean; // Optional flag for connection state
}

export const SpectrumView = memo(function SpectrumView({
  taskId,
  centerFreq,
  sampleRate,
  colorMap,
  dataError,
  isConnecting,
}: SpectrumViewProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const containerRef = useRef<HTMLDivElement>(null);
  const fftContainerRef = useRef<HTMLDivElement>(null);
  const waterfallContainerRef = useRef<HTMLDivElement>(null);
  const [fftSize, setFftSize] = useState({ width: 0, height: 0 });
  const [waterfallSize, setWaterfallSize] = useState({ width: 0, height: 0 });
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

  // Measure plot containers to derive usable content dimensions without hard-coding padding.
  useEffect(() => {
    const measureElement = (element: HTMLElement) => {
      const style = window.getComputedStyle(element);
      const paddingX =
        parseFloat(style.paddingLeft || "0") +
        parseFloat(style.paddingRight || "0");
      const paddingY =
        parseFloat(style.paddingTop || "0") +
        parseFloat(style.paddingBottom || "0");
      return {
        width: Math.max(0, element.clientWidth - paddingX),
        height: Math.max(0, element.clientHeight - paddingY),
      };
    };

    const updateSizes = () => {
      if (fftContainerRef.current) {
        const next = measureElement(fftContainerRef.current);
        setFftSize((prev) =>
          prev.width === next.width && prev.height === next.height ? prev : next
        );
      }
      if (waterfallContainerRef.current) {
        const next = measureElement(waterfallContainerRef.current);
        setWaterfallSize((prev) =>
          prev.width === next.width && prev.height === next.height ? prev : next
        );
      }
    };

    const observer = new ResizeObserver(updateSizes);

    if (containerRef.current) observer.observe(containerRef.current);
    if (fftContainerRef.current) observer.observe(fftContainerRef.current);
    if (waterfallContainerRef.current) observer.observe(waterfallContainerRef.current);

    updateSizes();

    return () => observer.disconnect();
  }, []);

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
        className="flex-[35] min-h-0 rounded-lg border border-slate-200 bg-white p-3 shadow-inner shadow-slate-200/60 dark:border-white/5 dark:bg-slate-900/40 dark:shadow-inner dark:shadow-black/40 relative"
        style={{ minHeight: '300px' }}
      >
        {(dataError || isConnecting) && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-lg z-10">
            <div className="text-center px-4">
              {isConnecting ? (
                <>
                  <div className="text-lg font-medium text-slate-700 dark:text-slate-200">
                    Connecting to data stream...
                  </div>
                  <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Please wait
                  </div>
                </>
              ) : (
                <>
                  <div className="text-lg font-medium text-red-600 dark:text-red-400">
                    Unable to retrieve data
                  </div>
                  <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {dataError || 'Connection to data stream failed'}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        <FFTDisplay
          width={Math.max(fftSize.width, 0)}
          height={Math.max(fftSize.height, 180)}
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
        className="flex-[65] min-h-0 rounded-lg border border-slate-200 bg-white p-3 shadow-inner shadow-slate-200/60 dark:border-white/5 dark:bg-slate-900/40 dark:shadow-inner dark:shadow-black/40 relative"
      >
        {(dataError || isConnecting) && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-lg z-10">
            <div className="text-center px-4">
              {isConnecting ? (
                <>
                  <div className="text-lg font-medium text-slate-700 dark:text-slate-200">
                    Connecting to data stream...
                  </div>
                  <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Please wait
                  </div>
                </>
              ) : (
                <>
                  <div className="text-lg font-medium text-red-600 dark:text-red-400">
                    Unable to retrieve data
                  </div>
                  <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {dataError || 'Connection to data stream failed'}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        <WaterfallDisplay
          width={Math.max(waterfallSize.width, 0)}
          height={Math.max(waterfallSize.height, 240)}
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
