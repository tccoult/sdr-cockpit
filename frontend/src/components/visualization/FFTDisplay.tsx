import { memo, useEffect, useMemo, useRef, useState } from "react";
import { FFTData, FrequencyRange } from "../../types/sdr";
import { formatFrequency } from "../../utils/formatters";
import {
  CursorStyle,
  Trace1DType,
  usePlot,
  type CursorInfo,
  type TraceHandle1D,
} from "../../utils/plotting";

interface FFTDisplayProps {
  width: number;
  height: number;
  minDb: number;
  maxDb: number;
  frequencyRange: FrequencyRange;
  onFrequencyRangeChange?: (range: FrequencyRange) => void;
}

const SMOOTHING_FACTOR = 0.95;
const MAX_POINTS = 2048;

export const FFTDisplay = memo(function FFTDisplay({
  width,
  height,
  minDb,
  maxDb,
  frequencyRange,
  onFrequencyRangeChange,
}: FFTDisplayProps) {
  const plotConfig = useMemo(
    () => ({
      axes: {
        x: {
          label: "Frequency",
          formatter: (value: number) => formatFrequency(value, true),
          range: { min: frequencyRange.startFreq, max: frequencyRange.endFreq },
        },
        y: {
          label: "Power (dB)",
          formatter: (value: number) => `${value.toFixed(1)} dB`,
          range: { min: minDb, max: maxDb },
        },
      },
      interactions: {
        zoom: "x" as const,
        pan: "x" as const,
        boxSelect: true,
        cursor: {
          style: CursorStyle.Vertical,
          snap: true,
        },
      },
      background: "rgba(10, 10, 15, 0.85)",
      grid: {
        show: true,
        color: "rgba(255, 255, 255, 0.1)",
      },
      margins: { top: 20, right: 30, bottom: 40, left: 60 },
    }),
    [frequencyRange, minDb, maxDb]
  );

  const plot = usePlot(plotConfig);
  const traceRef = useRef<TraceHandle1D | null>(null);
  const smoothingRef = useRef<Float32Array | null>(null);
  const fftMetaRef = useRef<{ sampleRate: number; centerFreq: number } | null>(
    null
  );
  const [cursorInfo, setCursorInfo] = useState<CursorInfo | null>(null);

  useEffect(() => {
    const handleZoom = (
      axis: "x" | "y" | "both",
      range: { min: number; max: number }
    ) => {
      if (axis !== "x" || !onFrequencyRangeChange) return;
      onFrequencyRangeChange({ startFreq: range.min, endFreq: range.max });
    };
    return plot.onZoom(handleZoom);
  }, [plot, onFrequencyRangeChange]);

  useEffect(() => {
    const handlePan = (
      axis: "x" | "y" | "both",
      range: { min: number; max: number }
    ) => {
      if (axis !== "x" || !onFrequencyRangeChange) return;
      onFrequencyRangeChange({ startFreq: range.min, endFreq: range.max });
    };
    return plot.onPan(handlePan);
  }, [plot, onFrequencyRangeChange]);

  useEffect(() => {
    const unsubscribeCursor = plot.onCursor((info) => {
      setCursorInfo(info);
    });
    return unsubscribeCursor;
  }, [plot]);

  useEffect(() => {
    const trace = plot.addTrace1D({
      type: Trace1DType.Line,
      color: "#FF00FF",
      lineWidth: 2,
    });
    traceRef.current = trace;
    return () => {
      trace.remove();
      traceRef.current = null;
    };
  }, [plot]);

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
            smoothed[i] * SMOOTHING_FACTOR + bins[i] * (1 - SMOOTHING_FACTOR);
        }
      }
      smoothingRef.current = smoothed;
      fftMetaRef.current = {
        sampleRate: incomingFFT.sampleRate,
        centerFreq: incomingFFT.centerFreq,
      };

      const trace = traceRef.current;
      if (!trace) {
        return;
      }

      const sampleRate = incomingFFT.sampleRate;
      const centerFreq = incomingFFT.centerFreq;
      const binCount = smoothed.length;
      if (!binCount) {
        return;
      }

      const binWidth = sampleRate / binCount;
      const fftStart = centerFreq - sampleRate / 2;
      const { startFreq, endFreq } = frequencyRange;
      let startBin = Math.floor((startFreq - fftStart) / binWidth);
      let endBin = Math.ceil((endFreq - fftStart) / binWidth);
      startBin = Math.max(0, Math.min(binCount - 1, startBin));
      endBin = Math.max(startBin + 1, Math.min(binCount, endBin));

      const rangeBinCount = endBin - startBin;
      const maxPoints = Math.min(MAX_POINTS, Math.max(1, rangeBinCount));
      const freqs = new Float32Array(maxPoints);
      const powers = new Float32Array(maxPoints);
      const step = maxPoints > 1 ? (rangeBinCount - 1) / (maxPoints - 1) : 0;

      for (let i = 0; i < maxPoints; i += 1) {
        const offset = maxPoints > 1 ? Math.round(i * step) : 0;
        const binIndex = Math.min(rangeBinCount - 1, offset) + startBin;
        freqs[i] = fftStart + binIndex * binWidth;
        let power = smoothed[binIndex];
        if (!Number.isFinite(power) || power < minDb) {
          power = minDb;
        } else if (power > maxDb) {
          power = maxDb;
        }
        powers[i] = power;
      }

      trace.update({
        x: freqs,
        y: powers,
      });
    };

    window.addEventListener("fft-data", handleFFTData);
    return () => window.removeEventListener("fft-data", handleFFTData);
  }, [frequencyRange, maxDb, minDb]);

  useEffect(() => {
    const range = plot.getAxisRange("x");
    if (
      range.min !== frequencyRange.startFreq ||
      range.max !== frequencyRange.endFreq
    ) {
      plot.setAxisRange("x", frequencyRange.startFreq, frequencyRange.endFreq);
    }
  }, [plot, frequencyRange]);

  useEffect(() => {
    const range = plot.getAxisRange("y");
    if (range.min !== minDb || range.max !== maxDb) {
      plot.setAxisRange("y", minDb, maxDb);
    }
  }, [plot, minDb, maxDb]);

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
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
          display: "block",
          width: "100%",
          height: "100%",
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
            zIndex: 2,
          }}
        >
          <div>Frequency: {formatFrequency(cursorInfo.dataX)}</div>
          <div>Power: {cursorInfo.dataY.toFixed(1)} dB</div>
        </div>
      )}
    </div>
  );
});
