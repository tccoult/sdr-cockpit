/**
 * Main spectrum visualization combining FFT and waterfall displays
 * Provides synchronized zoom, pan, and controls
 */

import { memo, useCallback, useEffect, useState } from "react";
import { FrequencyRange } from "../../types/sdr";
import { ColorMap } from "../../utils/colorMaps";
import { FFTDisplay } from "./FFTDisplay";
import { WaterfallDisplay } from "./WaterfallDisplay";

interface SpectrumViewProps {
  centerFreq: number; // Center frequency in Hz
  sampleRate: number; // Sample rate in Hz
  colorMap: ColorMap; // Selected color map
  onColorMapChange?: (colorMap: ColorMap) => void;
}

export const SpectrumView = memo(function SpectrumView({
  centerFreq,
  sampleRate,
  colorMap,
}: SpectrumViewProps) {
  // Display settings
  const [minDb, setMinDb] = useState(-100);
  const [maxDb, setMaxDb] = useState(-20);
  const [fftHeight] = useState(250);
  const [waterfallHeight] = useState(400);

  // Frequency range state (shared between FFT and waterfall)
  const [frequencyRange, setFrequencyRange] = useState<FrequencyRange>({
    startFreq: centerFreq - sampleRate / 2,
    endFreq: centerFreq + sampleRate / 2,
  });

  // Update frequency range when center freq or sample rate changes
  useEffect(() => {
    setFrequencyRange({
      startFreq: centerFreq - sampleRate / 2,
      endFreq: centerFreq + sampleRate / 2,
    });
  }, [centerFreq, sampleRate]);

  // Handle frequency range changes (from zoom/pan)
  const handleFrequencyRangeChange = useCallback((newRange: FrequencyRange) => {
    setFrequencyRange(newRange);
  }, []);

  // Get container dimensions (responsive)
  const containerWidth =
    typeof window !== "undefined"
      ? Math.min(window.innerWidth - 40, 1400)
      : 1200;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        width: containerWidth,
        background: "rgba(10, 10, 15, 0.6)",
        borderRadius: 8,
        padding: 16,
        border: "1px solid rgba(255, 255, 255, 0.1)",
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
        </div>
      </div>

      {/* FFT Display */}
      <div style={{ marginBottom: 8 }}>
        <FFTDisplay
          width={containerWidth - 32}
          height={fftHeight}
          minDb={minDb}
          maxDb={maxDb}
          frequencyRange={frequencyRange}
          onFrequencyRangeChange={handleFrequencyRangeChange}
        />
      </div>

      {/* Waterfall Display */}
      <div>
        <WaterfallDisplay
          width={containerWidth - 32}
          height={waterfallHeight}
          colorMap={colorMap}
          minDb={minDb}
          maxDb={maxDb}
          frequencyRange={frequencyRange}
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
        <strong>Controls:</strong> Mouse wheel to zoom | Click and drag to pan
        frequency | Drag selection on FFT to zoom to range
      </div>
    </div>
  );
});

function formatFrequency(freq: number): string {
  if (freq >= 1e9) return `${(freq / 1e9).toFixed(3)} GHz`;
  if (freq >= 1e6) return `${(freq / 1e6).toFixed(3)} MHz`;
  if (freq >= 1e3) return `${(freq / 1e3).toFixed(3)} kHz`;
  return `${freq.toFixed(0)} Hz`;
}
