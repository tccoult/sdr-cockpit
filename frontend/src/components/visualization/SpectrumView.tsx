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
  // Display settings
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200); // Default width
  const [minDb, setMinDb] = useState(-100);
  const [maxDb, setMaxDb] = useState(-20);
  const layout = useMemo(() => {
    const MIN_VIEW_HEIGHT = 620;
    const CONTROLS_RESERVE = 160;
    const MIN_FFT_HEIGHT = 220;
    const MIN_WATERFALL_HEIGHT = 320;

    const fallbackViewHeight =
      (typeof window !== "undefined"
        ? window.innerHeight - 260
        : MIN_VIEW_HEIGHT) || MIN_VIEW_HEIGHT;
    const containerHeight = Math.max(
      availableHeight ?? fallbackViewHeight,
      MIN_VIEW_HEIGHT
    );
    const plotAreaHeight = Math.max(
      containerHeight - CONTROLS_RESERVE,
      MIN_FFT_HEIGHT + MIN_WATERFALL_HEIGHT
    );

    let fftHeight = Math.max(Math.round(plotAreaHeight * 0.35), MIN_FFT_HEIGHT);
    let waterfallHeight = plotAreaHeight - fftHeight;

    if (waterfallHeight < MIN_WATERFALL_HEIGHT) {
      waterfallHeight = MIN_WATERFALL_HEIGHT;
      fftHeight = Math.max(plotAreaHeight - waterfallHeight, MIN_FFT_HEIGHT);
    }

    if (fftHeight < MIN_FFT_HEIGHT) {
      fftHeight = MIN_FFT_HEIGHT;
      waterfallHeight = Math.max(
        plotAreaHeight - fftHeight,
        MIN_WATERFALL_HEIGHT
      );
    }

    return {
      containerHeight,
      fftHeight,
      waterfallHeight,
    };
  }, [availableHeight]);

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
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setContainerWidth(entries[0].contentRect.width);
      }
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  const plotWidth = Math.max(containerWidth - 32, 0); // 32 is your padding (16*2)

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        width: "100%",
        background: "rgba(10, 10, 15, 0.6)",
        borderRadius: 8,
        padding: 16,
        border: "1px solid rgba(255, 255, 255, 0.1)",
        minHeight: layout.containerHeight,
        boxSizing: "border-box",
      }}
    >
      {/* Header with controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          color: "white",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>
            Spectrum Analyzer
          </h2>
          <div
            style={{
              fontSize: 12,
              color: "rgba(255, 255, 255, 0.6)",
              marginTop: 4,
            }}
          >
            Center: {formatFrequency(centerFreq)} | Sample Rate:{" "}
            {formatFrequency(sampleRate)}
          </div>
        </div>

        {/* Power range controls */}
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ fontSize: 12 }}>
            <label style={{ marginRight: 8 }}>Min dB:</label>
            <input
              type="number"
              value={minDb}
              onChange={(e) => setMinDb(Number(e.target.value))}
              style={{
                width: 60,
                padding: "4px 8px",
                background: "rgba(30, 30, 40, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: 4,
                color: "white",
              }}
            />
          </div>
          <div style={{ fontSize: 12 }}>
            <label style={{ marginRight: 8 }}>Max dB:</label>
            <input
              type="number"
              value={maxDb}
              onChange={(e) => setMaxDb(Number(e.target.value))}
              style={{
                width: 60,
                padding: "4px 8px",
                background: "rgba(30, 30, 40, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: 4,
                color: "white",
              }}
            />
          </div>
          <button
            onClick={autoRange}
            style={{
              padding: "6px 12px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: 4,
              color: "white",
              fontSize: 12,
              cursor: "pointer",
              transition: "all 0.2s",
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
            }}
          >
            Auto Range
          </button>
        </div>
      </div>

      {/* FFT Display */}
      <div style={{ marginBottom: 8 }}>
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

      {/* Waterfall Display */}
      <div>
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

      {/* Instructions */}
      <div
        style={{
          marginTop: 12,
          padding: 12,
          background: "rgba(0, 229, 255, 0.1)",
          border: "1px solid rgba(0, 229, 255, 0.3)",
          borderRadius: 4,
          color: "rgba(255, 255, 255, 0.8)",
          fontSize: 12,
        }}
      >
        <strong>Controls:</strong> Mouse wheel to zoom | Click and drag to pan |{" "}
        <strong>Shift+Drag</strong> on FFT to zoom to range
      </div>
    </div>
  );
});
