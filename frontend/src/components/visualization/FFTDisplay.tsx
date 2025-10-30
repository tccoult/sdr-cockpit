import { memo, useEffect, useMemo, useRef, useState } from "react";

import { CursorStyle, Trace1DType, usePlot } from "@/utils/plotting";
import type { PlotConfig, TraceHandle1D } from "@/utils/plotting";
import type { FFTData, FrequencyRange } from "../../types/sdr";
import { formatFrequency } from "../../utils/formatters";

interface FFTDisplayProps {
  width: number;
  height: number;
  minDb: number;
  maxDb: number;
  frequencyRange: FrequencyRange;
  onFrequencyRangeChange?: (range: FrequencyRange) => void;
}

const MAX_POINTS = 2048;
const SMOOTHING_FACTOR = 0.9;

function createPlotConfig(
  minDb: number,
  maxDb: number,
  frequencyRange: FrequencyRange
): PlotConfig {
  return {
    axes: {
      x: {
        label: "Frequency",
        formatter: (value) => formatFrequency(value, true),
        ticks: {
          formatter: (value) => formatFrequency(value, true),
        },
        range: {
          min: frequencyRange.startFreq,
          max: frequencyRange.endFreq,
        },
      },
      y: {
        label: "Power (dB)",
        ticks: {
          formatter: (value) => `${value.toFixed(0)} dB`,
        },
        range: { min: minDb, max: maxDb },
      },
    },
    grid: {
      show: true,
      color: "rgba(255, 255, 255, 0.1)",
    },
    background: "rgba(10, 10, 15, 0.85)",
    margins: { top: 20, right: 30, bottom: 40, left: 60 },
    interactions: {
      pan: "x",
      zoom: "x",
      boxSelect: true,
      cursor: {
        style: CursorStyle.Vertical,
        snap: true,
        color: "rgba(255, 255, 255, 0.7)",
        lineWidth: 1,
      },
      tooltip: false,
    },
    legend: { show: false },
  };
}

export const FFTDisplay = memo(function FFTDisplay({
  width,
  height,
  minDb,
  maxDb,
  frequencyRange,
  onFrequencyRangeChange,
}: FFTDisplayProps) {
  const config = useMemo(
    () => createPlotConfig(minDb, maxDb, frequencyRange),
    [minDb, maxDb, frequencyRange]
  );

  const plot = usePlot(config);
  const traceRef = useRef<TraceHandle1D | null>(null);
  const smoothingRef = useRef<Float32Array | null>(null);
  const lastFFTMetaRef = useRef<{
    sampleRate: number;
    centerFreq: number;
  } | null>(null);
  const [cursorInfo, setCursorInfo] = useState<{
    canvasX: number;
    canvasY: number;
    freq: number;
    power: number;
  } | null>(null);

  useEffect(() => {
    const trace = plot.addTrace1D({
      type: Trace1DType.Line,
      color: "#FF00FF",
      lineWidth: 2,
      label: "FFT",
    });
    traceRef.current = trace;
    return () => {
      trace.remove();
      traceRef.current = null;
    };
  }, [plot]);

  useEffect(() => {
    if (!onFrequencyRangeChange) {
      return;
    }
    const unsubscribeZoom = plot.onZoom((axis, range) => {
      if (axis !== "x") {
        return;
      }
      onFrequencyRangeChange({
        startFreq: range.min,
        endFreq: range.max,
      });
    });
    const unsubscribePan = plot.onPan((axis, range) => {
      if (axis !== "x") {
        return;
      }
      onFrequencyRangeChange({
        startFreq: range.min,
        endFreq: range.max,
      });
    });
    return () => {
      unsubscribeZoom();
      unsubscribePan();
    };
  }, [plot, onFrequencyRangeChange]);

  useEffect(() => {
    const unsubscribeCursor = plot.onCursor((info) => {
      if (!info || !info.snapped) {
        setCursorInfo(null);
        return;
      }
      setCursorInfo({
        canvasX: info.canvasX,
        canvasY: info.canvasY,
        freq: info.snapped.x,
        power: info.snapped.y,
      });
    });
    return () => {
      unsubscribeCursor();
    };
  }, [plot]);

  const updateTraceFromSmoothed = useMemo(() => {
    return () => {
      const trace = traceRef.current;
      const smoothed = smoothingRef.current;
      const meta = lastFFTMetaRef.current;
      if (!trace || !smoothed || !meta) {
        return;
      }

      const { sampleRate, centerFreq } = meta;
      const binCount = smoothed.length;
      if (binCount === 0) {
        return;
      }

      const binWidth = sampleRate / binCount;
      const fftStartFreq = centerFreq - sampleRate / 2;

      let startBin = Math.floor(
        (frequencyRange.startFreq - fftStartFreq) / binWidth
      );
      let endBin = Math.ceil(
        (frequencyRange.endFreq - fftStartFreq) / binWidth
      );
      startBin = Math.max(0, Math.min(binCount - 1, startBin));
      endBin = Math.max(startBin + 1, Math.min(binCount, endBin));

      const rangeBinCount = endBin - startBin;
      const maxPoints = Math.min(MAX_POINTS, Math.max(1, rangeBinCount));
      const freqs = new Float32Array(maxPoints);
      const powers = new Float32Array(maxPoints);
      const step =
        maxPoints > 1 ? (rangeBinCount - 1) / (maxPoints - 1) : 0;

      for (let i = 0; i < maxPoints; i += 1) {
        const offset = maxPoints > 1 ? Math.round(i * step) : 0;
        const binIndex = Math.min(rangeBinCount - 1, offset) + startBin;
        const freq = fftStartFreq + binIndex * binWidth;
        let power = smoothed[binIndex];
        if (!Number.isFinite(power) || power < minDb) {
          power = minDb;
        } else if (power > maxDb) {
          power = maxDb;
        }
        freqs[i] = freq;
        powers[i] = power;
      }

      trace.update({
        x: freqs,
        y: powers,
      });
    };
  }, [frequencyRange, maxDb, minDb]);

  useEffect(() => {
    const handleFFTData = (event: Event) => {
      const customEvent = event as CustomEvent<FFTData>;
      const incomingFFT = customEvent.detail;
      const bins = incomingFFT.bins;
      if (!bins.length) {
        return;
      }

      let smoothed = smoothingRef.current;
      if (!smoothed || smoothed.length !== bins.length) {
        smoothed = new Float32Array(bins);
      } else {
        for (let i = 0; i < bins.length; i += 1) {
          smoothed[i] =
            smoothed[i] * SMOOTHING_FACTOR +
            bins[i] * (1 - SMOOTHING_FACTOR);
        }
      }
      smoothingRef.current = smoothed;
      lastFFTMetaRef.current = {
        sampleRate: incomingFFT.sampleRate,
        centerFreq: incomingFFT.centerFreq,
      };

      updateTraceFromSmoothed();
    };

    window.addEventListener("fft-data", handleFFTData);
    return () => window.removeEventListener("fft-data", handleFFTData);
  }, [updateTraceFromSmoothed]);

  useEffect(() => {
    updateTraceFromSmoothed();
  }, [updateTraceFromSmoothed]);

  useEffect(() => {
    const plotRange = plot.getAxisRange("x");
    if (
      plotRange.min !== frequencyRange.startFreq ||
      plotRange.max !== frequencyRange.endFreq
    ) {
      plot.setAxisRange("x", frequencyRange.startFreq, frequencyRange.endFreq);
    }
    const yRange = plot.getAxisRange("y");
    if (yRange.min !== minDb || yRange.max !== maxDb) {
      plot.setAxisRange("y", minDb, maxDb);
    }
  }, [plot, frequencyRange, minDb, maxDb]);

  return (
    <div
      style={{
        position: "relative",
        width: `${width}px`,
        height: `${height}px`,
        background: "rgba(10, 10, 15, 0.85)",
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      <canvas
        ref={plot.canvasRef}
        width={width}
        height={height}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
      {cursorInfo && (
        <div
          style={{
            position: "absolute",
            left: Math.min(Math.max(cursorInfo.canvasX + 16, 8), width - 150),
            top: Math.min(Math.max(cursorInfo.canvasY - 40, 8), height - 60),
            background: "rgba(20, 20, 30, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: 4,
            padding: "6px 10px",
            color: "#ffffff",
            fontSize: 12,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 10,
          }}
        >
          <div>Frequency: {formatFrequency(cursorInfo.freq)}</div>
          <div>Power: {cursorInfo.power.toFixed(1)} dB</div>
        </div>
      )}
    </div>
  );
});
