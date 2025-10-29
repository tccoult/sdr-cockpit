/**
 * High-performance waterfall display using Canvas 2D
 * Optimized for 30+ FPS real-time rendering
 */

// FIX: Added useCallback
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FFTData, FrequencyRange } from "../../types/sdr";
import { ColorMap, buildColorLUT, dbToColorIndex } from "../../utils/colorMaps";
import { formatFrequency } from "../../utils/formatters";

interface WaterfallDisplayProps {
  width: number;
  height: number;
  colorMap: ColorMap;
  minDb: number;
  maxDb: number;
  frequencyRange: FrequencyRange;
  onFrequencyRangeChange?: (range: FrequencyRange) => void;
}

const shiftImageDown = (
  data: Uint8ClampedArray,
  width: number,
  height: number
) => {
  const rowBytes = width * 4;
  if (rowBytes <= 0 || data.length === 0) return;

  // Copy rows downward (last row discarded)
  for (let y = height - 1; y > 0; y--) {
    const srcOffset = (y - 1) * rowBytes;
    const dstOffset = y * rowBytes;
    data.copyWithin(dstOffset, srcOffset, srcOffset + rowBytes);
  }
};

export const WaterfallDisplay = memo(function WaterfallDisplay({
  width,
  height,
  colorMap,
  minDb,
  maxDb,
  frequencyRange,
  onFrequencyRangeChange,
}: WaterfallDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waterfallDataRef = useRef<ImageData | null>(null);
  const colorLUTRef = useRef<Uint8ClampedArray | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const lastMouseYRef = useRef<number>(0);

  // Margins to match FFT display for horizontal alignment
  const margin = { top: 20, right: 30, bottom: 40, left: 60 };

  // Create a memoized, integer-based source of truth for dimensions.
  const plotWidthInt = useMemo(
    () => Math.floor(width - margin.left - margin.right),
    [width, margin.left, margin.right]
  );
  const plotHeightInt = useMemo(
    () => Math.floor(height - margin.top - margin.bottom),
    [height, margin.top, margin.bottom]
  );

  // Initialize waterfall image buffer
  useEffect(() => {
    // Don't create a buffer if width/height is invalid
    if (!canvasRef.current || plotWidthInt <= 0 || plotHeightInt <= 0) {
      waterfallDataRef.current = null;
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Create image buffer for plot area only
    waterfallDataRef.current = ctx.createImageData(plotWidthInt, plotHeightInt);

    // Initialize to black
    const data = waterfallDataRef.current.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 0; // R
      data[i + 1] = 0; // G
      data[i + 2] = 0; // B
      data[i + 3] = 255; // A
    }
  }, [plotWidthInt, plotHeightInt]);

  // Build color lookup table when colormap changes
  useEffect(() => {
    colorLUTRef.current = buildColorLUT(colorMap);
  }, [colorMap]);

  const render = useCallback(() => {
    if (!canvasRef.current || !waterfallDataRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "rgba(10, 10, 15, 0.95)";
    ctx.fillRect(0, 0, width, height);

    // Draw waterfall data in plot area
    ctx.putImageData(waterfallDataRef.current, margin.left, margin.top);
  }, [width, height, margin.left, margin.top]);

  const requestRender = useCallback(() => {
    if (animationFrameRef.current !== null) return; // Already scheduled

    animationFrameRef.current = requestAnimationFrame(() => {
      render();
      animationFrameRef.current = null;
    });
  }, [render]);

  const addFFTRow = useCallback(
    (fftData: FFTData) => {
      // Check for valid state
      if (
        !waterfallDataRef.current ||
        !colorLUTRef.current ||
        plotWidthInt <= 0
      ) {
        return;
      }

      // Verify buffer integrity
      if (
        waterfallDataRef.current.width !== plotWidthInt ||
        waterfallDataRef.current.height !== plotHeightInt
      ) {
        // Buffer is out of sync (e.g., resizing), skip frame.
        // The useEffect hook will create a new buffer and this will work next frame.
        return;
      }

      const imageData = waterfallDataRef.current;
      const colorLUT = colorLUTRef.current;
      const data = imageData.data;

      // Shift existing data down by one row
      shiftImageDown(data, plotWidthInt, plotHeightInt);

      // Calculate which FFT bins to display based on frequency range
      const { startFreq, endFreq } = frequencyRange;
      const binWidth = fftData.sampleRate / fftData.bins.length;
      const centerFreq = fftData.centerFreq;
      const startBin = Math.max(
        0,
        Math.floor((startFreq - centerFreq + fftData.sampleRate / 2) / binWidth)
      );
      const endBin = Math.min(
        fftData.bins.length,
        Math.ceil((endFreq - centerFreq + fftData.sampleRate / 2) / binWidth)
      );

      // Map FFT bins to display pixels (plot area only)
      for (let x = 0; x < plotWidthInt; x++) {
        const binIndex = Math.floor(
          startBin + (x / plotWidthInt) * (endBin - startBin)
        );
        if (binIndex >= 0 && binIndex < fftData.bins.length) {
          const dbValue = fftData.bins[binIndex];
          const colorIdx = dbToColorIndex(dbValue, minDb, maxDb);

          // Get color from LUT
          const r = colorLUT[colorIdx * 4];
          const g = colorLUT[colorIdx * 4 + 1];
          const b = colorLUT[colorIdx * 4 + 2];

          // Set pixel in top row
          const pixelIdx = x * 4;
          data[pixelIdx] = r;
          data[pixelIdx + 1] = g;
          data[pixelIdx + 2] = b;
          data[pixelIdx + 3] = 255;
        }
      }

      // Request render
      requestRender();
    },
    [minDb, maxDb, frequencyRange, plotWidthInt, plotHeightInt, requestRender]
  );

  // Public method to add FFT data (will be called by parent)
  useEffect(() => {
    const handleFFTData = (event: Event) => {
      const customEvent = event as CustomEvent<FFTData>;
      addFFTRow(customEvent.detail);
    };

    window.addEventListener("fft-data", handleFFTData);
    return () => {
      window.removeEventListener("fft-data", handleFFTData);
    };
  }, [addFFTRow]); // Now only depends on the stable, memoized addFFTRow

  /**
   * Handle mouse wheel for zoom
   */
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
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
  };

  /**
   * Handle mouse down for panning
   */
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    lastMouseYRef.current = e.clientY;
  };

  /**
   * Handle mouse move for panning
   */
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (
      !isDragging ||
      !dragStart ||
      !onFrequencyRangeChange ||
      plotWidthInt <= 0
    )
      return;

    const deltaX = e.clientX - dragStart.x;
    const { startFreq, endFreq } = frequencyRange;
    const span = endFreq - startFreq;
    const freqShift = -(deltaX / plotWidthInt) * span;

    onFrequencyRangeChange({
      startFreq: startFreq + freqShift,
      endFreq: endFreq + freqShift,
    });

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  /**
   * Handle mouse up
   */
  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  return (
    <div style={{ position: "relative", width, height, overflow: "hidden" }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          display: "block",
          cursor: isDragging ? "grabbing" : "grab",
          imageRendering: "pixelated",
        }}
      />

      {/* Frequency scale overlay */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: margin.left,
          right: margin.right,
          height: 20,
          background: "rgba(0, 0, 0, 0.7)",
          color: "white",
          fontSize: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 5px",
          pointerEvents: "none",
        }}
      >
        <span>{formatFrequency(frequencyRange.startFreq)}</span>
        <span>
          {formatFrequency(
            (frequencyRange.startFreq + frequencyRange.endFreq) / 2
          )}
        </span>
        <span>{formatFrequency(frequencyRange.endFreq)}</span>
      </div>
    </div>
  );
});
