import { useCallback, useEffect, useRef, useState } from "react";
import { createPlot, type PlotInternalOptions } from "../engine/Plot";
import type { PlotHandle, ReactPlotHandle } from "../types";

export interface UsePlotOptions extends PlotInternalOptions {}

export function usePlot(options: UsePlotOptions = {}): ReactPlotHandle {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const plotRef = useRef<PlotHandle | null>(null);
  const [plot, setPlot] = useState<PlotHandle | null>(null);

  const attachCanvas = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      canvasRef.current = canvas;
      plotRef.current?.destroy();
      plotRef.current = null;
      setPlot(null);

      if (canvas) {
        const newPlot = createPlot(canvas, options);
        plotRef.current = newPlot;
        setPlot(newPlot);
      }
    },
    [options]
  );

  useEffect(
    () => () => {
      plotRef.current?.destroy();
      plotRef.current = null;
    },
    []
  );

  return { plot, attachCanvas };
}
