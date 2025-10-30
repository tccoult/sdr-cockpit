import { useContext, useEffect, useRef } from "react";

import { createPlotRuntime, type PlotRuntime } from "./core";
import type {
  CursorPosition,
  PlotConfig,
  PlotInstance,
  Trace1DConfig,
  Trace2DConfig,
} from "./types";
import { PlotSyncContext } from "./PlotSyncContext";

export function usePlot(config: PlotConfig): PlotInstance {
  const runtimeRef = useRef<PlotRuntime>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const instanceRef = useRef<PlotInstance | null>(null);
  const syncContext = useContext(PlotSyncContext);

  if (!runtimeRef.current) {
    runtimeRef.current = createPlotRuntime(config);
  }

  useEffect(() => {
    runtimeRef.current?.updateConfig(config);
  }, [config]);

  useEffect(() => {
    if (!syncContext || !runtimeRef.current) {
      return;
    }
    const unregister = syncContext.registerPlot(runtimeRef.current);
    return unregister;
  }, [syncContext]);

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
      setCursorPosition: (position: CursorPosition | null) =>
        runtimeRef.current!.setCursorPosition(position),
      requestRender: () => runtimeRef.current!.requestRender(),
      destroy: () => runtimeRef.current!.destroy(),
    };
  }

  return instanceRef.current;
}
