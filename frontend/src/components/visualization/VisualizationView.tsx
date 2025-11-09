import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  FFTData,
  FFTDataBatch,
  FrequencyRange,
  VisualizationMode,
} from "../../types/sdr";
import { ColorMap } from "../../utils/colorMaps";
import { FFTDisplay } from "./FFTDisplay";
import { WaterfallDisplay } from "./WaterfallDisplay";
import { SpectrogramDisplay } from "./SpectrogramDisplay";
import { VisualizationControls, InteractionMode } from "./VisualizationControls";
import { useTheme } from "../app/useTheme";

interface VisualizationViewProps {
  taskId: string;
  centerFreq: number;
  sampleRate: number;
  colorMap: ColorMap;
  visualizationMode?: VisualizationMode;
  dataError?: string;
  isConnecting?: boolean;
  onRenderFpsChange?: (fps: number) => void;
}

export const VisualizationView = memo(function VisualizationView({
  taskId,
  centerFreq,
  sampleRate,
  colorMap,
  visualizationMode = VisualizationMode.FFT_WATERFALL,
  dataError,
  isConnecting,
  onRenderFpsChange,
}: VisualizationViewProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const containerRef = useRef<HTMLDivElement>(null);
  const fftContainerRef = useRef<HTMLDivElement>(null);
  const waterfallContainerRef = useRef<HTMLDivElement>(null);
  const spectrogramContainerRef = useRef<HTMLDivElement>(null);

  const [fftSize, setFftSize] = useState({ width: 0, height: 0 });
  const [waterfallSize, setWaterfallSize] = useState({ width: 0, height: 0 });
  const [spectrogramSize, setSpectrogramSize] = useState({
    width: 0,
    height: 0,
  });
  const [minDb, setMinDb] = useState(-100);
  const [maxDb, setMaxDb] = useState(-20);
  const [waterfallResetKey, setWaterfallResetKey] = useState(0);
  const [fftRenderFps, setFftRenderFps] = useState(0);
  const [waterfallRenderFps, setWaterfallRenderFps] = useState(0);
  const [spectrogramRenderFps, setSpectrogramRenderFps] = useState(0);
  const [interactionMode, setInteractionMode] =
    useState<InteractionMode>("pan");

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
      const customEvent = event as CustomEvent<FFTDataBatch>;
      const frames = customEvent.detail?.frames;
      if (!frames || frames.length === 0) {
        return;
      }
      currentFFTRef.current = frames[frames.length - 1];
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
      let nextMin = Infinity;
      let nextMax = -Infinity;
      for (let i = 0; i < fftData.bins.length; i += 1) {
        const value = fftData.bins[i];
        if (Number.isFinite(value)) {
          nextMin = Math.min(nextMin, value);
          nextMax = Math.max(nextMax, value);
        }
      }
      if (Number.isFinite(nextMin) && Number.isFinite(nextMax) && nextMax > nextMin) {
        const range = nextMax - nextMin;
        const padding = range * 0.1;
        setMinDb(Math.floor(nextMin - padding));
        setMaxDb(Math.ceil(nextMax + padding));
      }
    } else {
      setMinDb(-100);
      setMaxDb(-20);
    }

    setWaterfallResetKey((value) => value + 1);
  }, [centerFreq, sampleRate]);

  useEffect(() => {
    autoRange();
  }, [centerFreq, sampleRate, autoRange]);

  const handleFrequencyRangeChange = useCallback((range: FrequencyRange) => {
    setFrequencyRange(range);
  }, []);

  useEffect(() => {
    if (!onRenderFpsChange) return;

    let fpsSources: number[] = [];
    switch (visualizationMode) {
      case VisualizationMode.FFT_ONLY:
        fpsSources = [fftRenderFps];
        break;
      case VisualizationMode.FFT_WATERFALL:
        fpsSources = [fftRenderFps, waterfallRenderFps];
        break;
      case VisualizationMode.SPECTROGRAM:
        fpsSources = [spectrogramRenderFps];
        break;
    }
    const filtered = fpsSources.filter((value) => value > 0);
    const combined =
      filtered.length === 0
        ? 0
        : filtered.length === 1
        ? filtered[0]
        : Math.min(...filtered);
    onRenderFpsChange(combined);
  }, [
    fftRenderFps,
    waterfallRenderFps,
    spectrogramRenderFps,
    visualizationMode,
    onRenderFpsChange,
  ]);

  useEffect(() => {
    return () => {
      onRenderFpsChange?.(0);
    };
  }, [onRenderFpsChange]);

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
      if (spectrogramContainerRef.current) {
        const next = measureElement(spectrogramContainerRef.current);
        setSpectrogramSize((prev) =>
          prev.width === next.width && prev.height === next.height ? prev : next
        );
      }
    };

    const observer = new ResizeObserver(updateSizes);
    const targets: Element[] = [];
    if (containerRef.current) targets.push(containerRef.current);
    if (fftContainerRef.current) targets.push(fftContainerRef.current);
    if (waterfallContainerRef.current) targets.push(waterfallContainerRef.current);
    if (spectrogramContainerRef.current) targets.push(spectrogramContainerRef.current);

    targets.forEach((element) => observer.observe(element));
    updateSizes();

    return () => observer.disconnect();
  }, [visualizationMode]);

  const containerClasses = [
    "flex flex-1 flex-col gap-2 rounded-xl border p-2 min-h-0 overflow-auto sm:gap-3 sm:p-3",
    isDark
      ? "border-white/10 bg-slate-950/60 text-slate-100 shadow-2xl shadow-black/40"
      : "border-slate-300 bg-slate-50 text-slate-900 shadow-2xl shadow-slate-400/60",
  ].join(" ");

  const plotContainerClasses =
    "rounded-lg border border-slate-300 bg-slate-50 p-2 shadow-inner shadow-slate-300/70 dark:border-white/5 dark:bg-slate-900/40 dark:shadow-inner dark:shadow-black/40 relative sm:p-3";

  const renderStatusOverlay = () => {
    if (!dataError && !isConnecting) {
      return null;
    }
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-50/90 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-sm rounded-lg z-10">
        <div className="text-center px-4">
          {isConnecting ? (
            <>
              <div className="text-lg font-medium text-slate-800 dark:text-slate-200">
                Connecting to data stream...
              </div>
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Please wait
              </div>
            </>
          ) : (
            <>
              <div className="text-lg font-medium text-status-error dark:text-status-error">
                Unable to retrieve data
              </div>
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {dataError || "Connection to data stream failed"}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const viewDataKey = `${taskId}-${visualizationMode}`;
  const showFFT =
    visualizationMode === VisualizationMode.FFT_ONLY ||
    visualizationMode === VisualizationMode.FFT_WATERFALL;
  const showWaterfall = visualizationMode === VisualizationMode.FFT_WATERFALL;
  const showSpectrogram = visualizationMode === VisualizationMode.SPECTROGRAM;

  return (
    <div ref={containerRef} className={containerClasses}>
      {showFFT && (
        <div
          ref={fftContainerRef}
          className={`${plotContainerClasses} min-h-[200px] sm:min-h-[300px] ${
            visualizationMode === VisualizationMode.FFT_ONLY
              ? "flex-none sm:flex-1"
              : "flex-none sm:flex-[35]"
          }`}
        >
          {renderStatusOverlay()}
          <FFTDisplay
            width={Math.max(fftSize.width, 0)}
            height={Math.max(fftSize.height, 180)}
            minDb={minDb}
            maxDb={maxDb}
            frequencyRange={frequencyRange}
            dataKey={viewDataKey}
            onFrequencyRangeChange={handleFrequencyRangeChange}
            theme={theme}
            onRenderFpsChange={setFftRenderFps}
            interactionMode={interactionMode}
          />
        </div>
      )}

      {showWaterfall && (
        <div
          ref={waterfallContainerRef}
          className={`${plotContainerClasses} flex-none min-h-[240px] sm:flex-[65] sm:min-h-[360px]`}
        >
          {renderStatusOverlay()}
          <WaterfallDisplay
            width={Math.max(waterfallSize.width, 0)}
            height={waterfallSize.height > 0 ? waterfallSize.height : 240}
            colorMap={colorMap}
            minDb={minDb}
            maxDb={maxDb}
            frequencyRange={frequencyRange}
            dataKey={viewDataKey}
            onFrequencyRangeChange={handleFrequencyRangeChange}
            theme={theme}
            resetYKey={waterfallResetKey}
            onRenderFpsChange={setWaterfallRenderFps}
            interactionMode={interactionMode}
          />
        </div>
      )}

      {showSpectrogram && (
        <div
          ref={spectrogramContainerRef}
          className={`${plotContainerClasses} flex-none min-h-[400px] sm:flex-1 sm:min-h-[600px]`}
        >
          {renderStatusOverlay()}
          <SpectrogramDisplay
            width={Math.max(spectrogramSize.width, 0)}
            height={Math.max(spectrogramSize.height, 360)}
            colorMap={colorMap}
            minDb={minDb}
            maxDb={maxDb}
            frequencyRange={frequencyRange}
            dataKey={viewDataKey}
            onFrequencyRangeChange={handleFrequencyRangeChange}
            theme={theme}
            onRenderFpsChange={setSpectrogramRenderFps}
            interactionMode={interactionMode}
          />
        </div>
      )}

      <VisualizationControls
        interactionMode={interactionMode}
        onInteractionModeChange={setInteractionMode}
        minDb={minDb}
        maxDb={maxDb}
        onMinDbChange={setMinDb}
        onMaxDbChange={setMaxDb}
        onAutoRange={autoRange}
      />
    </div>
  );
});
