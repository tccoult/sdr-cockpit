/**
 * High-performance Canvas-based FFT display
 * Optimized for 60 FPS real-time rendering with polished interactions
 */

import { useEffect, useRef, useState, useMemo, memo, useCallback } from 'react';
import { FFTData, FrequencyRange } from '../../types/sdr';

interface CanvasFFTDisplayProps {
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

export const CanvasFFTDisplay = memo(function CanvasFFTDisplay({
  width,
  height,
  minDb,
  maxDb,
  frequencyRange,
  onFrequencyRangeChange,
  accentColor = '#00e5ff',
}: CanvasFFTDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [currentFFT, setCurrentFFT] = useState<FFTData | null>(null);
  const [cursorInfo, setCursorInfo] = useState<CursorInfo | null>(null);
  const [zoomSelection, setZoomSelection] = useState<ZoomSelection | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // Canvas margins for axes and labels
  const margin = { top: 20, right: 30, bottom: 40, left: 60 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  // Listen for FFT data updates
  useEffect(() => {
    const handleFFTData = (event: Event) => {
      const customEvent = event as CustomEvent<FFTData>;
      setCurrentFFT(customEvent.detail);
    };

    window.addEventListener('fft-data', handleFFTData);
    return () => {
      window.removeEventListener('fft-data', handleFFTData);
    };
  }, []);

  // Convert FFT data to chart data format (same as recharts version)
  const chartData = useMemo(() => {
    if (!currentFFT) return [];

    const { centerFreq, sampleRate, bins } = currentFFT;
    const { startFreq, endFreq } = frequencyRange;
    const binWidth = sampleRate / bins.length;

    const data: { freq: number; power: number }[] = [];

    // Calculate which bins to display
    const startBin = Math.max(0, Math.floor((startFreq - centerFreq + sampleRate / 2) / binWidth));
    const endBin = Math.min(bins.length, Math.ceil((endFreq - centerFreq + sampleRate / 2) / binWidth));

    // Sample bins for display (limit to ~1000 points for performance)
    const step = Math.max(1, Math.floor((endBin - startBin) / 1000));

    for (let i = startBin; i < endBin; i += step) {
      const freq = centerFreq - sampleRate / 2 + i * binWidth;
      const power = bins[i];
      data.push({ freq, power });
    }

    return data;
  }, [currentFFT, frequencyRange]);

  // Coordinate transformation utilities
  const freqToX = useCallback((freq: number): number => {
    const { startFreq, endFreq } = frequencyRange;
    const normalized = (freq - startFreq) / (endFreq - startFreq);
    return margin.left + normalized * plotWidth;
  }, [frequencyRange, plotWidth, margin.left]);

  const xToFreq = useCallback((x: number): number => {
    const { startFreq, endFreq } = frequencyRange;
    const normalized = (x - margin.left) / plotWidth;
    return startFreq + normalized * (endFreq - startFreq);
  }, [frequencyRange, plotWidth, margin.left]);

  const dbToY = useCallback((db: number): number => {
    const normalized = (db - minDb) / (maxDb - minDb);
    return margin.top + plotHeight - normalized * plotHeight;
  }, [minDb, maxDb, plotHeight, margin.top]);

  const yToDb = useCallback((y: number): number => {
    const normalized = (plotHeight - (y - margin.top)) / plotHeight;
    return minDb + normalized * (maxDb - minDb);
  }, [minDb, maxDb, plotHeight, margin.top]);

  // Format frequency for display
  const formatFrequency = useCallback((freq: number, short: boolean = false): string => {
    if (Math.abs(freq) >= 1e9) return short ? `${(freq / 1e9).toFixed(2)}G` : `${(freq / 1e9).toFixed(6)} GHz`;
    if (Math.abs(freq) >= 1e6) return short ? `${(freq / 1e6).toFixed(1)}M` : `${(freq / 1e6).toFixed(3)} MHz`;
    if (Math.abs(freq) >= 1e3) return short ? `${(freq / 1e3).toFixed(1)}k` : `${(freq / 1e3).toFixed(3)} kHz`;
    return short ? `${freq.toFixed(0)}` : `${freq.toFixed(0)} Hz`;
  }, []);

  // Calculate intelligent tick spacing
  const calculateTicks = useCallback((min: number, max: number, targetCount: number = 8): number[] => {
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
  }, []);

  // Main render function
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Fill background
    ctx.fillStyle = 'rgba(10, 10, 15, 0.8)';
    ctx.fillRect(0, 0, width, height);

    // ===== GRID AND AXES =====
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    // Frequency (vertical) grid lines
    const freqTicks = calculateTicks(frequencyRange.startFreq, frequencyRange.endFreq, 8);
    freqTicks.forEach(freq => {
      const x = freqToX(freq);
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, height - margin.bottom);
      ctx.stroke();
    });

    // Power (horizontal) grid lines
    const dbTicks = calculateTicks(minDb, maxDb, 8);
    dbTicks.forEach(db => {
      const y = dbToY(db);
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(width - margin.right, y);
      ctx.stroke();
    });

    ctx.restore();

    // ===== AXES LABELS =====
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';

    // X-axis (frequency) labels
    freqTicks.forEach(freq => {
      const x = freqToX(freq);
      ctx.fillText(formatFrequency(freq, true), x, height - margin.bottom + 20);
    });

    // Y-axis (power) labels
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    dbTicks.forEach(db => {
      const y = dbToY(db);
      ctx.fillText(db.toFixed(0), margin.left - 10, y);
    });

    // Y-axis title (rotated)
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Power (dB)', 0, 0);
    ctx.restore();

    // X-axis title
    ctx.textAlign = 'center';
    ctx.fillText('Frequency', width / 2, height - 5);

    // ===== FFT TRACE =====
    if (chartData.length > 0) {
      ctx.strokeStyle = accentColor;
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

      ctx.stroke(path);
    }

    // ===== ZOOM SELECTION AREA =====
    if (zoomSelection && isSelecting) {
      const x1 = Math.min(zoomSelection.startX, zoomSelection.endX);
      const x2 = Math.max(zoomSelection.startX, zoomSelection.endX);
      const selectionWidth = x2 - x1;

      // Fill
      ctx.fillStyle = 'rgba(0, 229, 255, 0.2)';
      ctx.fillRect(x1, margin.top, selectionWidth, plotHeight);

      // Border
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.strokeRect(x1, margin.top, selectionWidth, plotHeight);
    }

    // ===== CURSOR AND TOOLTIP =====
    if (cursorInfo && !isSelecting) {
      const x = freqToX(cursorInfo.freq);
      const y = dbToY(cursorInfo.power);

      // Vertical cursor line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, height - margin.bottom);
      ctx.stroke();

      // Circular marker
      ctx.fillStyle = accentColor;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Tooltip
      const tooltipText = [
        `Frequency: ${formatFrequency(cursorInfo.freq)}`,
        `Power: ${cursorInfo.power.toFixed(1)} dB`
      ];

      // Measure tooltip size
      ctx.font = '12px monospace';
      const maxWidth = Math.max(
        ctx.measureText(tooltipText[0]).width,
        ctx.measureText(tooltipText[1]).width
      );
      const tooltipWidth = maxWidth + 24;
      const tooltipHeight = 48;

      // Smart positioning: left or right of cursor
      let tooltipX = x + 20;
      if (tooltipX + tooltipWidth > width - margin.right) {
        tooltipX = x - tooltipWidth - 20;
      }
      const tooltipY = y - 30;

      // Draw tooltip background
      ctx.fillStyle = 'rgba(20, 20, 30, 0.95)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;

      // Rounded rectangle
      const radius = 4;
      ctx.beginPath();
      ctx.moveTo(tooltipX + radius, tooltipY);
      ctx.lineTo(tooltipX + tooltipWidth - radius, tooltipY);
      ctx.quadraticCurveTo(tooltipX + tooltipWidth, tooltipY, tooltipX + tooltipWidth, tooltipY + radius);
      ctx.lineTo(tooltipX + tooltipWidth, tooltipY + tooltipHeight - radius);
      ctx.quadraticCurveTo(tooltipX + tooltipWidth, tooltipY + tooltipHeight, tooltipX + tooltipWidth - radius, tooltipY + tooltipHeight);
      ctx.lineTo(tooltipX + radius, tooltipY + tooltipHeight);
      ctx.quadraticCurveTo(tooltipX, tooltipY + tooltipHeight, tooltipX, tooltipY + tooltipHeight - radius);
      ctx.lineTo(tooltipX, tooltipY + radius);
      ctx.quadraticCurveTo(tooltipX, tooltipY, tooltipX + radius, tooltipY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw tooltip text
      ctx.fillStyle = 'white';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(tooltipText[0], tooltipX + 12, tooltipY + 10);
      ctx.fillText(tooltipText[1], tooltipX + 12, tooltipY + 26);
    }
  }, [
    width, height, margin, plotWidth, plotHeight, chartData, frequencyRange,
    minDb, maxDb, accentColor, cursorInfo, zoomSelection, isSelecting,
    freqToX, dbToY, formatFrequency, calculateTicks
  ]);

  // Request render on next frame
  const requestRender = useCallback(() => {
    if (animationFrameRef.current !== null) return; // Already scheduled

    animationFrameRef.current = requestAnimationFrame(() => {
      render();
      animationFrameRef.current = null;
    });
  }, [render]);

  // Trigger render when dependencies change
  useEffect(() => {
    requestRender();
  }, [requestRender]);

  // Mouse move handler - update cursor info
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !chartData.length) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if cursor is in plot area
    if (x < margin.left || x > width - margin.right || y < margin.top || y > height - margin.bottom) {
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

    // Update zoom selection end
    if (isSelecting && zoomSelection) {
      setZoomSelection({
        ...zoomSelection,
        endX: x,
        endFreq: freq
      });
    }
  }, [chartData, margin, width, height, xToFreq, isSelecting, zoomSelection]);

  // Mouse down - start zoom selection
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;

    // Only start selection if in plot area
    if (x < margin.left || x > width - margin.right) return;

    const freq = xToFreq(x);
    setIsSelecting(true);
    setZoomSelection({
      startX: x,
      endX: x,
      startFreq: freq,
      endFreq: freq,
    });
  }, [margin, width, xToFreq]);

  // Mouse up - complete zoom
  const handleMouseUp = useCallback(() => {
    if (!isSelecting || !zoomSelection || !onFrequencyRangeChange) {
      setIsSelecting(false);
      setZoomSelection(null);
      return;
    }

    const newStartFreq = Math.min(zoomSelection.startFreq, zoomSelection.endFreq);
    const newEndFreq = Math.max(zoomSelection.startFreq, zoomSelection.endFreq);

    // Only zoom if selection is significant (> 1kHz)
    if (newEndFreq - newStartFreq > 1000) {
      onFrequencyRangeChange({
        startFreq: newStartFreq,
        endFreq: newEndFreq,
      });
    }

    setIsSelecting(false);
    setZoomSelection(null);
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
  const handleWheel = useCallback((e: React.WheelEvent) => {
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
  }, [frequencyRange, onFrequencyRangeChange]);

  return (
    <div
      style={{
        width,
        height,
        background: 'rgba(10, 10, 15, 0.8)',
        borderRadius: 4,
        overflow: 'hidden',
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
          display: 'block',
          cursor: isSelecting ? 'crosshair' : 'default',
        }}
      />
    </div>
  );
});
