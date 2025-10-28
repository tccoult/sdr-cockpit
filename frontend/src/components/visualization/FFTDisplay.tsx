/**
 * High-performance Canvas-based FFT display
 * Optimized for 60 FPS real-time rendering with polished interactions
 * Uses DOM overlays for crisp text rendering
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FFTData, FrequencyRange } from "../../types/sdr";

interface FFTDisplayProps {
  width: number;
  height: number;
  minDb: number;
  maxDb: number;
  frequencyRange: FrequencyRange;
  onFrequencyRangeChange?: (range: FrequencyRange) => void;
  accentColor?: string;
}

interface CursorInfo {
  x: number;
  y: number;
  freq: number;
  power: number;
}

interface ZoomSelection {
  startX: number;
  endX: number;
  startFreq: number;
  endFreq: number;
}

export const FFTDisplay = memo(function FFTDisplay({
  width,
  height,
  minDb,
  maxDb,
  frequencyRange,
  onFrequencyRangeChange,
  accentColor = "#66d0ff",
}: FFTDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [currentFFT, setCurrentFFT] = useState<FFTData | null>(null);
  const [cursorInfo, setCursorInfo] = useState<CursorInfo | null>(null);
  const [zoomSelection, setZoomSelection] = useState<ZoomSelection | null>(
    null
  );
  const [isSelecting, setIsSelecting] = useState(false);

  // Canvas margins for axes and labels
  const margin = useMemo(
    () => ({ top: 20, right: 30, bottom: 40, left: 60 }),
    []
  );

  const plotWidth = Math.max(0, width - margin.left - margin.right);
  const plotHeight = Math.max(0, height - margin.top - margin.bottom);

  const [smoothedFFT, setSmoothedFFT] = useState<Float32Array | null>(null);
  const smoothingFactor = 0.9; // 0-1, higher = more smoothing (try 0.5-0.8)

  useEffect(() => {
    const handleFFTData = (event: Event) => {
      const customEvent = event as CustomEvent<FFTData>;
      const newFFT = customEvent.detail;

      // Blend with previous frame
      if (smoothedFFT && smoothedFFT.length === newFFT.bins.length) {
        const blended = new Float32Array(newFFT.bins.length);
        for (let i = 0; i < newFFT.bins.length; i++) {
          blended[i] =
            smoothedFFT[i] * smoothingFactor +
            newFFT.bins[i] * (1 - smoothingFactor);
        }
        setCurrentFFT({ ...newFFT, bins: blended });
        setSmoothedFFT(blended);
      } else {
        // First frame or size changed
        setCurrentFFT(newFFT);
        setSmoothedFFT(newFFT.bins);
      }
    };

    window.addEventListener("fft-data", handleFFTData);
    return () => window.removeEventListener("fft-data", handleFFTData);
  }, [smoothedFFT]);

  // Convert FFT data to chart data format (same as recharts version)
  const chartData = useMemo(() => {
    if (!currentFFT) return [];

    const { centerFreq, sampleRate, bins } = currentFFT;
    const { startFreq, endFreq } = frequencyRange;
    const binWidth = sampleRate / bins.length;

    const data: { freq: number; power: number }[] = [];

    // Calculate which bins to display
    const startBin = Math.max(
      0,
      Math.floor((startFreq - centerFreq + sampleRate / 2) / binWidth)
    );
    const endBin = Math.min(
      bins.length,
      Math.ceil((endFreq - centerFreq + sampleRate / 2) / binWidth)
    );

    // Sample bins for display (limit to ~512 points for performance)
    const step = Math.max(1, Math.floor((endBin - startBin) / 512));

    for (let i = startBin; i < endBin; i += step) {
      const freq = centerFreq - sampleRate / 2 + i * binWidth;
      const power = bins[i];
      data.push({ freq, power });
    }

    return data;
  }, [currentFFT, frequencyRange]);

  // Coordinate transformation utilities
  const freqToX = useCallback(
    (freq: number): number => {
      const { startFreq, endFreq } = frequencyRange;
      const normalized = (freq - startFreq) / (endFreq - startFreq);
      return margin.left + normalized * plotWidth;
    },
    [frequencyRange, plotWidth, margin.left]
  );

  const xToFreq = useCallback(
    (x: number): number => {
      const { startFreq, endFreq } = frequencyRange;
      const normalized = (x - margin.left) / plotWidth;
      return startFreq + normalized * (endFreq - startFreq);
    },
    [frequencyRange, plotWidth, margin.left]
  );

  const dbToY = useCallback(
    (db: number): number => {
      const normalized = (db - minDb) / (maxDb - minDb);
      return margin.top + plotHeight - normalized * plotHeight;
    },
    [minDb, maxDb, plotHeight, margin.top]
  );

  // const yToDb = useCallback(
  //   (y: number): number => {
  //     const normalized = (plotHeight - (y - margin.top)) / plotHeight;
  //     return minDb + normalized * (maxDb - minDb);
  //   },
  //   [minDb, maxDb, plotHeight, margin.top]
  // );

  // Format frequency for display
  const formatFrequency = useCallback(
    (freq: number, short: boolean = false): string => {
      if (Math.abs(freq) >= 1e9)
        return short
          ? `${(freq / 1e9).toFixed(2)}G`
          : `${(freq / 1e9).toFixed(6)} GHz`;
      if (Math.abs(freq) >= 1e6)
        return short
          ? `${(freq / 1e6).toFixed(1)}M`
          : `${(freq / 1e6).toFixed(3)} MHz`;
      if (Math.abs(freq) >= 1e3)
        return short
          ? `${(freq / 1e3).toFixed(1)}k`
          : `${(freq / 1e3).toFixed(3)} kHz`;
      return short ? `${freq.toFixed(0)}` : `${freq.toFixed(0)} Hz`;
    },
    []
  );

  // Calculate intelligent tick spacing
  const calculateTicks = useCallback(
    (min: number, max: number, targetCount: number = 8): number[] => {
      const range = max - min;
      const roughStep = range / (targetCount - 1);
      const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
      const residual = roughStep / magnitude;

      let step: number;
      if (residual > 5) step = 10 * magnitude;
      else if (residual > 2) step = 5 * magnitude;
      else if (residual > 1) step = 2 * magnitude;
      else step = magnitude;

      const ticks: number[] = [];
      const start = Math.ceil(min / step) * step;
      for (let tick = start; tick <= max; tick += step) {
        ticks.push(tick);
      }
      return ticks;
    },
    []
  );

  // Calculate ticks for overlays
  const freqTicks = useMemo(
    () => calculateTicks(frequencyRange.startFreq, frequencyRange.endFreq, 8),
    [frequencyRange, calculateTicks]
  );

  const dbTicks = useMemo(
    () => calculateTicks(minDb, maxDb, 8),
    [minDb, maxDb, calculateTicks]
  );

  // Main render function (NO TEXT RENDERING - only graphics)
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Fill background
    ctx.fillStyle = "rgba(10, 10, 15, 0.8)";
    ctx.fillRect(0, 0, width, height);

    // ===== GRID AND AXES =====
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    // Frequency (vertical) grid lines
    freqTicks.forEach((freq) => {
      const x = freqToX(freq);
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, height - margin.bottom);
      ctx.stroke();
    });

    // Power (horizontal) grid lines
    dbTicks.forEach((db) => {
      const y = dbToY(db);
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(width - margin.right, y);
      ctx.stroke();
    });

    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 1;

    // Y-Axis (left)
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, height - margin.bottom);
    ctx.stroke();

    // X-Axis (bottom)
    ctx.beginPath();
    ctx.moveTo(margin.left, height - margin.bottom);
    ctx.lineTo(width - margin.right, height - margin.bottom);
    ctx.stroke();

    ctx.restore();

    // ===== FFT TRACE =====
    if (chartData.length > 0) {
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);

      const path = new Path2D();
      chartData.forEach((point, i) => {
        const x = freqToX(point.freq);
        const y = dbToY(point.power);

        if (i === 0) {
          path.moveTo(x, y);
        } else {
          path.lineTo(x, y);
        }
      });
      ctx.lineWidth = 2.0;
      ctx.strokeStyle = "#FF00FF";
      ctx.stroke(path);
    }

    // ===== ZOOM SELECTION AREA =====
    if (zoomSelection && isSelecting) {
      const x1 = Math.min(zoomSelection.startX, zoomSelection.endX);
      const x2 = Math.max(zoomSelection.startX, zoomSelection.endX);
      const selectionWidth = x2 - x1;

      // Semi-transparent selection box
      ctx.fillStyle = "rgba(255, 0, 255, 0.05)";
      ctx.fillRect(x1, margin.top, selectionWidth, plotHeight);

      // Selection borders
      ctx.strokeStyle = "rgba(255, 0, 255, 0.2)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.strokeRect(x1, margin.top, selectionWidth, plotHeight);
    }

    // ===== CURSOR CROSSHAIR =====
    if (cursorInfo) {
      const x = freqToX(cursorInfo.freq);
      const y = dbToY(cursorInfo.power);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, height - margin.bottom);
      ctx.stroke();

      ctx.strokeStyle = "#FFFF00";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, [
    width,
    height,
    margin,
    plotHeight,
    chartData,
    freqTicks,
    dbTicks,
    accentColor,
    cursorInfo,
    zoomSelection,
    isSelecting,
    freqToX,
    dbToY,
  ]);

  // Request render on next frame
  const requestRender = useCallback(() => {
    if (animationFrameRef.current !== null) return; // Already scheduled

    animationFrameRef.current = requestAnimationFrame(() => {
      render();
      animationFrameRef.current = null;
    });
  }, [render]);

  useEffect(() => {
    requestRender();
  }, [requestRender]);

  // One-time DPI setup when dimensions change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    // Scale canvas for high-DPI
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    // Scale back down via CSS
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Scale all drawing operations
    ctx.scale(dpr, dpr);
  }, [width, height]);

  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number } | null>(null);

  // Mouse move handler - update cursor info
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !chartData.length) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check if cursor is in plot area
      if (
        x < margin.left ||
        x > width - margin.right ||
        y < margin.top ||
        y > height - margin.bottom
      ) {
        setCursorInfo(null);
        if (isSelecting && zoomSelection) {
          setZoomSelection({ ...zoomSelection, endX: x });
        }
        return;
      }

      const freq = xToFreq(x);

      // Find closest data point
      let closestPoint = chartData[0];
      let minDistance = Math.abs(chartData[0].freq - freq);

      for (const point of chartData) {
        const distance = Math.abs(point.freq - freq);
        if (distance < minDistance) {
          minDistance = distance;
          closestPoint = point;
        }
      }

      setCursorInfo({
        x,
        y,
        freq: closestPoint.freq,
        power: closestPoint.power,
      });

      if (isPanning && dragStart) {
        if (!onFrequencyRangeChange) return;

        const deltaX = e.clientX - dragStart.x;
        const { startFreq, endFreq } = frequencyRange;
        const span = endFreq - startFreq;
        const freqShift = -(deltaX / plotWidth) * span; // Use plotWidth

        onFrequencyRangeChange({
          startFreq: startFreq + freqShift,
          endFreq: endFreq + freqShift,
        });

        setDragStart({ x: e.clientX });
        return; // Don't show cursor info while panning
      }

      // Update zoom selection end
      if (isSelecting && zoomSelection) {
        setZoomSelection({
          ...zoomSelection,
          endX: x,
          endFreq: freq,
        });
      }
    },
    [
      chartData,
      margin,
      width,
      height,
      isPanning,
      dragStart,
      isSelecting,
      zoomSelection,
      onFrequencyRangeChange,
      frequencyRange,
      plotWidth,
      xToFreq,
    ]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;

      if (x < margin.left || x > width - margin.right) return;

      if (e.shiftKey) {
        // SHIFT key is pressed
        const freq = xToFreq(x);
        setIsSelecting(true); // Start region zoom
        setZoomSelection({
          startX: x,
          endX: x,
          startFreq: freq,
          endFreq: freq,
        });
      } else {
        // No shift key
        setIsPanning(true); // Start panning
        setDragStart({ x: e.clientX });
      }
    },
    [margin, width, xToFreq]
  );

  // Mouse up - complete zoom
  const handleMouseUp = useCallback(() => {
    if (isSelecting && zoomSelection && onFrequencyRangeChange) {
      const newStartFreq = Math.min(
        zoomSelection.startFreq,
        zoomSelection.endFreq
      );
      const newEndFreq = Math.max(
        zoomSelection.startFreq,
        zoomSelection.endFreq
      );

      // Only zoom if selection is significant (> 1kHz)
      if (newEndFreq - newStartFreq > 1000) {
        onFrequencyRangeChange({
          startFreq: newStartFreq,
          endFreq: newEndFreq,
        });
      }
    }

    setIsPanning(false);
    setIsSelecting(false);
    setZoomSelection(null);
    setDragStart(null);
  }, [isSelecting, zoomSelection, onFrequencyRangeChange]);

  // Mouse leave - cancel cursor and selection
  const handleMouseLeave = useCallback(() => {
    setCursorInfo(null);
    if (isSelecting) {
      setIsSelecting(false);
      setZoomSelection(null);
    }
  }, [isSelecting]);

  // Wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (!onFrequencyRangeChange) return;

      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const { startFreq, endFreq } = frequencyRange;
      const centerFreq = (startFreq + endFreq) / 2;
      const span = (endFreq - startFreq) / 2;
      const newSpan = span * zoomFactor;

      onFrequencyRangeChange({
        startFreq: centerFreq - newSpan,
        endFreq: centerFreq + newSpan,
      });
    },
    [frequencyRange, onFrequencyRangeChange]
  );

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        background: "rgba(10, 10, 15, 0.8)",
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        style={{
          display: "block",
          cursor: isPanning
            ? "grabbing"
            : isSelecting
            ? "crosshair"
            : "default",
        }}
      />

      {/* X-axis (frequency) labels - DOM overlay */}
      {freqTicks.map((freq) => (
        <div
          key={`freq-${freq}`}
          style={{
            position: "absolute",
            left: freqToX(freq),
            bottom: margin.bottom - 20,
            transform: "translateX(-50%)",
            color: "white",
            fontSize: "12px",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          {formatFrequency(freq, true)}
        </div>
      ))}

      {/* Y-axis (power) labels - DOM overlay */}
      {dbTicks.map((db) => (
        <div
          key={`db-${db}`}
          style={{
            position: "absolute",
            left: margin.left - 10,
            top: dbToY(db),
            transform: "translate(-100%, -50%)",
            color: "rgba(255, 255, 255, 1.0)",
            fontSize: "12px",
            textAlign: "right",
            pointerEvents: "none",
          }}
        >
          {db.toFixed(0)}
        </div>
      ))}

      {/* Cursor tooltip */}
      {cursorInfo && (
        <div
          style={{
            position: "absolute",
            left: freqToX(cursorInfo.freq) + 20,
            top: dbToY(cursorInfo.power) - 30,
            background: "rgba(20, 20, 30, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "4px",
            padding: "8px 12px",
            color: "white",
            fontSize: "12px",
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
