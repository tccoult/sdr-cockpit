import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  FFTData,
  FFTDataBatch,
  FrequencyRange,
  VisualizationMode,
} from "../../types/sdr";
import { ColorMap } from "../../utils/colorMaps";
import { useTheme } from "../app/useTheme";
import { FFTDisplay } from "./FFTDisplay";
import { SpectrogramDisplay } from "./SpectrogramDisplay";
import {
  InteractionMode,
  VisualizationControls,
} from "./VisualizationControls";
import { WaterfallDisplay } from "./WaterfallDisplay";
import { FFT_PERSISTENCE_CONFIG } from "./persistenceConfig";

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
  const fftPersistenceRef = useRef<{
    current: Float32Array | null;
    ghosts: Float32Array[];
    maxHold: Float32Array | null;
  }>({ current: null, ghosts: [], maxHold: null });
  useEffect(() => {
    currentFFTRef.current = null;
    fftPersistenceRef.current = { current: null, ghosts: [], maxHold: null };
  }, [taskId]);

  useEffect(() => {
    const handleFFTData = (event: Event) => {
      const customEvent = event as CustomEvent<FFTDataBatch>;
      const frames = customEvent.detail?.frames;
      if (!frames || frames.length === 0) {
        return;
      }
      const incoming = frames[frames.length - 1];
      currentFFTRef.current = incoming;

      const bins = incoming.bins;
      if (bins.length === 0) {
        fftPersistenceRef.current = {
          current: null,
          ghosts: [],
          maxHold: null,
        };
        return;
      }

      const snapshot = new Float32Array(bins);
      const persistence = fftPersistenceRef.current;

      if (persistence.current) {
        if (persistence.current.length !== snapshot.length) {
          persistence.ghosts = [];
        } else {
          persistence.ghosts.push(persistence.current);
          while (
            persistence.ghosts.length > FFT_PERSISTENCE_CONFIG.ghostTraceCount
          ) {
            persistence.ghosts.shift();
          }
        }
      }

      let maxHold = persistence.maxHold;
      if (!maxHold || maxHold.length !== snapshot.length) {
        maxHold = new Float32Array(snapshot);
      } else {
        const decay = FFT_PERSISTENCE_CONFIG.maxHoldDecay;
        for (let i = 0; i < snapshot.length; i += 1) {
          maxHold[i] = Math.max(maxHold[i] * decay, snapshot[i]);
        }
      }

      fftPersistenceRef.current = {
        current: snapshot,
        ghosts: [...persistence.ghosts],
        maxHold,
      };
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
      const persistence = fftPersistenceRef.current;
      const sources: (Float32Array | null | undefined)[] = [
        persistence.current,
        ...persistence.ghosts,
        persistence.maxHold,
      ];
      if (sources.every((source) => !source)) {
        for (let i = 0; i < fftData.bins.length; i += 1) {
          const value = fftData.bins[i];
          if (Number.isFinite(value)) {
            nextMin = Math.min(nextMin, value);
            nextMax = Math.max(nextMax, value);
          }
        }
      } else {
        for (const array of sources) {
          if (!array) continue;
          for (let i = 0; i < array.length; i += 1) {
            const value = array[i];
            if (Number.isFinite(value)) {
              nextMin = Math.min(nextMin, value);
              nextMax = Math.max(nextMax, value);
            }
          }
        }
      }
      if (
        Number.isFinite(nextMin) &&
        Number.isFinite(nextMax) &&
        nextMax > nextMin
      ) {
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
    if (waterfallContainerRef.current)
      targets.push(waterfallContainerRef.current);
    if (spectrogramContainerRef.current)
      targets.push(spectrogramContainerRef.current);

    targets.forEach((element) => observer.observe(element));
    updateSizes();

    return () => observer.disconnect();
  }, [visualizationMode]);

  const surfaceClasses =
    "viz-surface relative flex min-h-0 flex-1 flex-col overflow-hidden";

  const sectionBaseClasses =
    "relative flex flex-col overflow-hidden min-h-[180px] bg-transparent";

  const renderStatusOverlay = () => {
    if (!dataError && !isConnecting) {
      return null;
    }

    const overlayClasses =
      "viz-overlay absolute inset-0 z-20 flex items-center justify-center rounded-sm border backdrop-blur-sm";

    return (
      <div className={overlayClasses}>
        <div className="px-4 text-center">
          {isConnecting ? (
            <>
              <div className="text-base font-semibold sm:text-lg">
                Connecting to data stream...
              </div>
              <div className="mt-2 text-xs text-viz-text/70 sm:text-sm">
                Please wait
              </div>
            </>
          ) : (
            <>
              <div className="text-base font-semibold text-status-error sm:text-lg">
                Unable to retrieve data
              </div>
              <div className="mt-2 text-xs text-viz-text/70 sm:text-sm">
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
  const fftSectionClasses = [
    sectionBaseClasses,
    visualizationMode === VisualizationMode.FFT_ONLY ? "flex-1" : "flex-[35]",
    "min-h-[200px] sm:min-h-[260px]",
  ].join(" ");
  const waterfallSectionClasses = [
    sectionBaseClasses,
    "flex-[65] sm:min-h-[320px]",
  ].join(" ");
  const spectrogramSectionClasses = [
    sectionBaseClasses,
    "flex-1 sm:min-h-[520px]",
  ].join(" ");

  return (
    <div className="viz-panel relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div ref={containerRef} className={surfaceClasses}>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {showFFT && (
            <div ref={fftContainerRef} className={fftSectionClasses}>
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
              className={waterfallSectionClasses}
            >
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
              className={spectrogramSectionClasses}
            >
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
      </div>
      {/* Overlay layers */}
      {renderStatusOverlay()}
    </div>
  );
});
