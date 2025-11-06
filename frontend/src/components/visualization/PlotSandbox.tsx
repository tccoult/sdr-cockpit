import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  usePlot,
  type CursorState,
  type LineLayerHandle,
  type PlotCreationOptions,
} from "../../plot";

interface PlotSandboxProps {
  width?: number;
  height?: number;
}

const DEFAULT_WIDTH = 640;
const DEFAULT_HEIGHT = 360;
const SAMPLE_POINTS = 1024;

export const PlotSandbox = memo(function PlotSandbox({
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
}: PlotSandboxProps) {
  const sampleX = useMemo(() => {
    const buffer = new Float32Array(SAMPLE_POINTS);
    for (let i = 0; i < SAMPLE_POINTS; i += 1) {
      buffer[i] = i / SAMPLE_POINTS;
    }
    return buffer;
  }, []);

  const options = useMemo<PlotCreationOptions>(() => ({
    background: "rgba(10, 12, 18, 0.9)",
    theme: {
      gridColor: "rgba(255, 255, 255, 0.1)",
      textColor: "#ffffff",
      axisColor: "rgba(255, 255, 255, 0.4)",
      cursorLineColor: "rgba(255, 255, 255, 0.7)",
      cursorHighlightColor: "#ffff7a",
    },
    interactions: {
      pan: { x: true, y: false },
      zoom: { x: true, y: false, factor: 0.2 },
      cursor: { enabled: true, style: "crosshair" },
    },
    axes: {
      x: { label: "X", ticksTarget: 6, formatter: (v) => v.toFixed(2) },
      y: { label: "Y", ticksTarget: 6, formatter: (v) => v.toFixed(2) },
    },
  }), []);

  const { plot, attachCanvas } = usePlot(options);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const traceRef = useRef<LineLayerHandle | null>(null);
  const rafRef = useRef<number | null>(null);
  const [cursor, setCursor] = useState<CursorState | null>(null);

  const handleCanvas = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      canvasRef.current = canvas;
      attachCanvas(canvas);
      if (canvas) {
        canvas.style.touchAction = "none";
        canvas.style.cursor = "crosshair";
      }
    },
    [attachCanvas]
  );

  useEffect(() => {
    if (!plot) return;
    const unsubscribe = plot.onCursor(setCursor);
    return unsubscribe;
  }, [plot]);

  useEffect(() => {
    if (!plot) return;
    plot.setXRange({ min: 0, max: 1 });
    plot.setYRange({ min: -1.5, max: 1.5 });
  }, [plot]);

  useEffect(() => {
    if (!plot) return;
    const line = plot.addLine({
      color: "#00ffd0",
      lineWidth: 2,
    });
    traceRef.current = line;
    return () => {
      line.remove();
      traceRef.current = null;
    };
  }, [plot]);

  useEffect(() => {
    if (!plot) return;
    const target = new Float32Array(SAMPLE_POINTS);
    const update = () => {
      const now = performance.now() / 1000;
      for (let i = 0; i < SAMPLE_POINTS; i += 1) {
        const t = sampleX[i];
        target[i] =
          Math.sin(2 * Math.PI * (t + now * 0.2)) * 0.9 +
          Math.sin(2 * Math.PI * (t * 3 + now * 0.4)) * 0.3;
      }
      traceRef.current?.setXY(sampleX, target);
      plot.requestDraw();
      rafRef.current = requestAnimationFrame(update);
    };
    rafRef.current = requestAnimationFrame(update);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = null;
    };
  }, [plot, sampleX]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        background: "rgba(15, 18, 26, 0.85)",
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
          color: "rgba(255, 255, 255, 0.95)",
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        <span>Plot Sandbox</span>
        {cursor && (
          <span>
            x={cursor.dataX.toFixed(3)} y={cursor.dataY.toFixed(3)}
          </span>
        )}
      </div>
      <div style={{ position: "relative", width: "100%", height }}>
        <canvas
          ref={handleCanvas}
          width={width}
          height={height}
          style={{ display: "block", width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
});
