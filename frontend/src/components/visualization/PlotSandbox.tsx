import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  CursorStyle,
  Trace1DType,
  usePlot,
  type CursorInfo,
  type PlotConfig,
  type TraceHandle1D,
  type TraceHandle2D,
} from "../../utils/plotting";

interface PlotSandboxProps {
  width?: number;
  height?: number;
}

const DEFAULT_WIDTH = 600;
const DEFAULT_HEIGHT = 320;
const SAMPLE_POINTS = 1024;

function buildConfig(): PlotConfig {
  return {
    axes: {
      x: {
        label: "Frequency (Hz)",
        range: { min: 0, max: 1 },
        formatter: (value) => `${(value * 100).toFixed(0)}`,
      },
      y: {
        label: "Amplitude",
        range: { min: -1.5, max: 1.5 },
        formatter: (value) => value.toFixed(2),
      },
    },
    grid: {
      show: true,
      color: "rgba(255, 255, 255, 0.1)",
    },
    background: "rgba(10, 10, 15, 0.9)",
    interactions: {
      zoom: "both",
      pan: "both",
      boxSelect: true,
      cursor: {
        style: CursorStyle.Crosshair,
        snap: false,
      },
    },
  };
}

export const PlotSandbox = memo(function PlotSandbox({
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
}: PlotSandboxProps) {
  const config = useMemo(buildConfig, []);
  const plot = usePlot(config);
  const traceRef = useRef<TraceHandle1D | null>(null);
  const animationRef = useRef<number | null>(null);
  const frameCounterRef = useRef(0);
  const lastStatsUpdateRef = useRef<number | null>(null);
  const cursorInfoRef = useRef<HTMLDivElement | null>(null);
  const [renderCount, setRenderCount] = useState(0);

  const xValues = useMemo(() => {
    const data = new Float32Array(SAMPLE_POINTS);
    for (let i = 0; i < SAMPLE_POINTS; i += 1) {
      data[i] = i / SAMPLE_POINTS;
    }
    return data;
  }, []);

  const yValuesRef = useRef<Float32Array>(new Float32Array(SAMPLE_POINTS));
  useEffect(() => {
    yValuesRef.current.fill(0);
  }, []);

  const imageData = useMemo(() => {
    const width = 256;
    const height = 256;
    const xAxis = new Float32Array(width);
    const yAxis = new Float32Array(height);
    const values = new Float32Array(width * height);
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (let x = 0; x < width; x += 1) {
      xAxis[x] = x / (width - 1);
    }
    for (let y = 0; y < height; y += 1) {
      yAxis[y] = -1 + (2 * y) / (height - 1);
      for (let x = 0; x < width; x += 1) {
        const fx = xAxis[x];
        const fy = yAxis[y];
        const value = Math.sin(2 * Math.PI * fx * 3) * Math.cos(2 * Math.PI * fy * 2);
        values[y * width + x] = value;
        if (value < min) min = value;
        if (value > max) max = value;
      }
    }
    return { width, height, values, xAxis, yAxis, min, max };
  }, []);
  const dynamicImageValuesRef = useRef<Float32Array>(imageData.values.slice());
  const imagePhaseRef = useRef(0);



  const imageTraceRef = useRef<TraceHandle2D | null>(null);

  useEffect(() => {
    const trace = plot.addTrace2D({
      colorMap: "plasma",
      valueRange: { min: imageData.min, max: imageData.max },
      opacity: 0.8,
      zIndex: 0,
    });
    imageTraceRef.current = trace;
    trace.update({
      x: imageData.xAxis,
      y: imageData.yAxis,
      z: dynamicImageValuesRef.current,
      width: imageData.width,
      height: imageData.height,
    });
    plot.requestRender();
    return () => {
      trace.remove();
      imageTraceRef.current = null;
    };
  }, [plot, imageData]);


  useEffect(() => {
    const trace = plot.addTrace1D({
      type: Trace1DType.Line,
      color: "#00ffd0",
      lineWidth: 2,
      zIndex: 1,
    });
    traceRef.current = trace;
    return () => {
      trace.remove();
      traceRef.current = null;
    };
  }, [plot]);

  useEffect(() => {
    const updateTrace = () => {
      const trace = traceRef.current;
      if (!trace) {
        return;
      }
      const target = yValuesRef.current;

      const now = performance.now() / 1000;
      for (let i = 0; i < SAMPLE_POINTS; i += 1) {
        const t = xValues[i];
        target[i] =
          Math.sin(2 * Math.PI * (t + now * 0.2)) * 0.9 +
          Math.sin(2 * Math.PI * (t * 4 + now * 0.5)) * 0.3;
      }

      trace.update({
        x: xValues,
        y: target,
      });
      const imageTrace = imageTraceRef.current;
      if (imageTrace) {
        const values = dynamicImageValuesRef.current;
        const { width: imgWidth, height: imgHeight } = imageData;
        const phase = imagePhaseRef.current;
        let idxVal = 0;
        for (let y = 0; y < imgHeight; y += 1) {
          const fy = imageData.yAxis[y];
          for (let x = 0; x < imgWidth; x += 1) {
            const fx = imageData.xAxis[x];
            values[idxVal] = Math.sin(2 * Math.PI * (fx * 3 + phase * 0.3)) * Math.cos(2 * Math.PI * (fy * 2 - phase * 0.2));
            idxVal += 1;
          }
        }
        imageTrace.update({
          x: imageData.xAxis,
          y: imageData.yAxis,
          z: values,
          width: imageData.width,
          height: imageData.height,
        });
      }
      imagePhaseRef.current += 0.016;
      plot.requestRender();
      frameCounterRef.current += 1;
      const nowMs = performance.now();
      if (
        lastStatsUpdateRef.current === null ||
        nowMs - lastStatsUpdateRef.current >= 500
      ) {
        setRenderCount((prev) => prev + frameCounterRef.current);
        frameCounterRef.current = 0;
        lastStatsUpdateRef.current = nowMs;
      }
      animationRef.current = requestAnimationFrame(updateTrace);
    };
    animationRef.current = requestAnimationFrame(updateTrace);
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      frameCounterRef.current = 0;
      lastStatsUpdateRef.current = null;
    };
  }, [plot, xValues]);

  useEffect(() => {
    const handleCursor = (info: CursorInfo | null) => {
      const tooltip = cursorInfoRef.current;
      if (!tooltip) {
        return;
      }
      if (!info) {
        tooltip.style.opacity = "0";
        return;
      }
      tooltip.style.opacity = "1";
      tooltip.style.transform = `translate(${info.canvasX + 12}px, ${info.canvasY - 36}px)`;
      const freqText = `f=${info.dataX.toFixed(3)}`;
      const ampText = info.snapped
        ? `amp=${info.dataY.toFixed(2)}`
        : `y=${info.dataY.toFixed(2)}`;
      const intensityText =
        info.dataZ !== null ? `int=${info.dataZ.toFixed(2)}` : "";
      tooltip.textContent = [freqText, ampText, intensityText]
        .filter(Boolean)
        .join("  ");
    };
    const unsubscribe = plot.onCursor(handleCursor);
    return () => {
      unsubscribe();
    };
  }, [plot]);

  useEffect(() => {
    const canvas = plot.canvasRef.current;
    if (!canvas) return;
    canvas.style.touchAction = "none";
    canvas.style.cursor = "crosshair";
  }, [plot]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        background: "rgba(20, 20, 30, 0.9)",
        borderRadius: 8,
        padding: 16,
        border: "1px solid rgba(255, 255, 255, 0.08)",
        width,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "rgba(255, 255, 255, 0.9)",
          fontSize: 12,
          letterSpacing: 0.2,
        }}
      >
        <span>Plotting Sandbox</span>
        <span>renders: {renderCount}</span>
      </div>
      <div style={{ position: "relative", width: "100%", height }}>
        <canvas
          ref={plot.canvasRef}
          width={width}
          height={height}
          style={{ display: "block", width: "100%", height: "100%" }}
        />
        <div
          ref={cursorInfoRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            padding: "4px 8px",
            background: "rgba(0,0,0,0.7)",
            color: "#fff",
            fontSize: 10,
            borderRadius: 4,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            opacity: 0,
            transition: "opacity 120ms ease-out",
          }}
        />
      </div>
      <div
        style={{
          fontSize: 11,
          color: "rgba(255, 255, 255, 0.6)",
          lineHeight: 1.6,
        }}
      >
        <div>• Wheel to zoom horizontally</div>
        <div>• Drag to pan</div>
        <div>• Hover to read amplitude (1D) and intensity (2D)</div>
        <div>• Hover to read amplitude (line) and intensity (image)</div>
        <div>• Hold Shift + drag to box-zoom</div>
      </div>
    </div>
  );
});
