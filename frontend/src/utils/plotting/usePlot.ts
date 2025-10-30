import { useEffect, useRef } from "react";

import { createPlotRuntime, type PlotRuntime } from "./core";
import type {
  PlotConfig,
  PlotInstance,
  Trace1DConfig,
  Trace2DConfig,
} from "./types";

export function usePlot(config: PlotConfig): PlotInstance {
  const runtimeRef = useRef<PlotRuntime>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const instanceRef = useRef<PlotInstance | null>(null);

  if (!runtimeRef.current) {
    runtimeRef.current = createPlotRuntime(config);
  }

  useEffect(() => {
    runtimeRef.current?.updateConfig(config);
  }, [config]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }
    runtime.attachCanvas(canvas);
    return () => {
      runtime.detachCanvas();
    };
  }, []);

  useEffect(() => {
    return () => {
      runtimeRef.current?.destroy();
    };
  }, []);

  if (!instanceRef.current) {
    instanceRef.current = {
      canvasRef,
      addTrace1D: (traceConfig: Trace1DConfig) =>
        runtimeRef.current!.addTrace1D(traceConfig),
      addTrace2D: (traceConfig: Trace2DConfig) =>
        runtimeRef.current!.addTrace2D(traceConfig),
      clearTraces: () => runtimeRef.current!.clearTraces(),
      setAxisRange: (axis, min, max) =>
        runtimeRef.current!.setAxisRange(axis, min, max),
      getAxisRange: (axis) => runtimeRef.current!.getAxisRange(axis),
      autoRange: (axis, padding) => runtimeRef.current!.autoRange(axis, padding),
      onZoom: (callback) => runtimeRef.current!.onZoom(callback),
      onPan: (callback) => runtimeRef.current!.onPan(callback),
      onCursor: (callback) => runtimeRef.current!.onCursor(callback),
      requestRender: () => runtimeRef.current!.requestRender(),
      destroy: () => runtimeRef.current!.destroy(),
    };
  }

  return instanceRef.current;
}
