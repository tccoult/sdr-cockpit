/**
 * Main visualization component that manages different plot types based on task configuration
 */

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { FFTDataBatch, FrequencyRange, VisualizationMode } from "../../types/sdr";
import { ColorMap, buildColorLUT } from "../../utils/colorMaps";
import { VisualizationControls, InteractionMode } from "./VisualizationControls";
import { useTheme } from "../app/useTheme";
import { useVisualizationManager } from "./useVisualizationManager";

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

  // Container refs
  const containerRef = useRef<HTMLDivElement>(null);
  const fftCanvasRef = useRef<HTMLCanvasElement>(null);
  const waterfallCanvasRef = useRef<HTMLCanvasElement>(null);
  const spectrogramCanvasRef = useRef<HTMLCanvasElement>(null);

  // State
  const [fftSize, setFftSize] = useState({ width: 0, height: 0 });
  const [waterfallSize, setWaterfallSize] = useState({ width: 0, height: 0 });
  const [spectrogramSize, setSpectrogramSize] = useState({ width: 0, height: 0 });
  const [minDb, setMinDb] = useState(-100);
  const [maxDb, setMaxDb] = useState(-20);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>("pan");

  const [frequencyRange, setFrequencyRange] = useState<FrequencyRange>({
    startFreq: centerFreq - sampleRate / 2,
    endFreq: centerFreq + sampleRate / 2,
  });

  // Build color LUT
  const colorLUT = buildColorLUT(colorMap);

  // Create visualization manager
  const manager = useVisualizationManager({
    theme,
    colorMap: colorLUT,
    minDb,
    maxDb,
    frequencyRange,
    onFrequencyRangeChange: setFrequencyRange,
    onRenderFpsChange,
  });

  // Update mode when visualization mode or canvases change
  useEffect(() => {
    if (!manager) return;

    const configs: Parameters<typeof manager.setMode>[1] = {};

    if (visualizationMode === "fft-only" && fftCanvasRef.current && fftSize.width > 0) {
      configs.fft = {
        canvas: fftCanvasRef.current,
        width: fftSize.width,
        height: fftSize.height,
      };
    } else if (visualizationMode === "fft-waterfall") {
      if (fftCanvasRef.current && fftSize.width > 0) {
        configs.fft = {
          canvas: fftCanvasRef.current,
          width: fftSize.width,
          height: fftSize.height,
        };
      }
      if (waterfallCanvasRef.current && waterfallSize.width > 0) {
        configs.waterfall = {
          canvas: waterfallCanvasRef.current,
          width: waterfallSize.width,
          height: waterfallSize.height,
        };
      }
    } else if (visualizationMode === "spectrogram" && spectrogramCanvasRef.current && spectrogramSize.width > 0) {
      configs.spectrogram = {
        canvas: spectrogramCanvasRef.current,
        width: spectrogramSize.width,
        height: spectrogramSize.height,
      };
    }

    manager.setMode(visualizationMode, configs);
  }, [manager, visualizationMode, fftSize, waterfallSize, spectrogramSize]);

  // Listen for data events
  useEffect(() => {
    if (!manager) return;

    const handleFFTData = (event: Event) => {
      const customEvent = event as CustomEvent<FFTDataBatch>;
      manager.handleDataBatch(customEvent.detail);
    };

    window.addEventListener("fft-data", handleFFTData);
    return () => window.removeEventListener("fft-data", handleFFTData);
  }, [manager]);

  // Auto-range functionality
  const autoRange = useCallback(() => {
    setFrequencyRange({
      startFreq: centerFreq - sampleRate / 2,
      endFreq: centerFreq + sampleRate / 2,
    });
    // Note: Auto dB range would require access to current data
    // For now, just reset to defaults
    setMinDb(-100);
    setMaxDb(-20);
  }, [centerFreq, sampleRate]);

  // Update frequency range when center freq or sample rate changes
  useEffect(() => {
    autoRange();
  }, [centerFreq, sampleRate, autoRange]);

  // Measure canvas container sizes
  useEffect(() => {
    const measureElement = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      return {
        width: Math.max(0, rect.width),
        height: Math.max(0, rect.height),
      };
    };

    const updateSizes = () => {
      const fftContainer = containerRef.current?.querySelector("#fft-container");
      const waterfallContainer = containerRef.current?.querySelector("#waterfall-container");
      const spectrogramContainer = containerRef.current?.querySelector("#spectrogram-container");

      if (fftContainer) {
        const next = measureElement(fftContainer as HTMLElement);
        setFftSize((prev) =>
          prev.width === next.width && prev.height === next.height ? prev : next
        );
      }

      if (waterfallContainer) {
        const next = measureElement(waterfallContainer as HTMLElement);
        setWaterfallSize((prev) =>
          prev.width === next.width && prev.height === next.height ? prev : next
        );
      }

      if (spectrogramContainer) {
        const next = measureElement(spectrogramContainer as HTMLElement);
        setSpectrogramSize((prev) =>
          prev.width === next.width && prev.height === next.height ? prev : next
        );
      }
    };

    const observer = new ResizeObserver(updateSizes);

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    updateSizes();

    return () => observer.disconnect();
  }, [visualizationMode]);

  const containerClasses = [
    "flex flex-1 flex-col gap-3 rounded-xl border p-3 min-h-0",
    isDark
      ? "border-white/10 bg-slate-950/60 text-slate-100 shadow-2xl shadow-black/40"
      : "border-slate-200 bg-white text-slate-900 shadow-xl shadow-slate-300/80",
  ].join(" ");

  const plotContainerClasses =
    "rounded-lg border border-slate-200 bg-white p-3 shadow-inner shadow-slate-200/60 dark:border-white/5 dark:bg-slate-900/40 dark:shadow-inner dark:shadow-black/40 relative";

  return (
    <div ref={containerRef} className={containerClasses}>
      {/* FFT Display (for fft-only and fft-waterfall modes) */}
      {(visualizationMode === VisualizationMode.FFT_ONLY || visualizationMode === VisualizationMode.FFT_WATERFALL) && (
        <div
          id="fft-container"
          className={`${plotContainerClasses} ${
            visualizationMode === VisualizationMode.FFT_ONLY ? "flex-1" : "flex-[35]"
          } min-h-0`}
          style={{ minHeight: "300px" }}
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
                      {dataError || "Connection to data stream failed"}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          <canvas
            ref={fftCanvasRef}
            width={fftSize.width}
            height={fftSize.height}
            style={{ display: "block", width: "100%", height: "100%" }}
          />
        </div>
      )}

      {/* Waterfall Display (for fft-waterfall mode only) */}
      {visualizationMode === VisualizationMode.FFT_WATERFALL && (
        <div
          id="waterfall-container"
          className={`${plotContainerClasses} flex-[65] min-h-0`}
          style={{ minHeight: "360px" }}
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
                      {dataError || "Connection to data stream failed"}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          <canvas
            ref={waterfallCanvasRef}
            width={waterfallSize.width}
            height={waterfallSize.height}
            style={{ display: "block", width: "100%", height: "100%" }}
          />
        </div>
      )}

      {/* Spectrogram Display (for spectrogram mode only) */}
      {visualizationMode === VisualizationMode.SPECTROGRAM && (
        <div
          id="spectrogram-container"
          className={`${plotContainerClasses} flex-1 min-h-0`}
          style={{ minHeight: "600px" }}
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
                      {dataError || "Connection to data stream failed"}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          <canvas
            ref={spectrogramCanvasRef}
            width={spectrogramSize.width}
            height={spectrogramSize.height}
            style={{ display: "block", width: "100%", height: "100%" }}
          />
        </div>
      )}

      {/* Controls */}
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
