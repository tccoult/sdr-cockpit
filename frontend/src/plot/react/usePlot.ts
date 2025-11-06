import { useCallback, useRef, useState } from "react";
import { createPlot, type PlotInternalOptions } from "../engine/Plot";
import type { PlotHandle, ReactPlotHandle } from "../types";

export interface UsePlotOptions extends PlotInternalOptions {}

export function usePlot(options: UsePlotOptions = {}): ReactPlotHandle {
  const plotRef = useRef<PlotHandle | null>(null);
  const [plot, setPlot] = useState<PlotHandle | null>(null);

  const attachCanvas = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (plotRef.current) {
        plotRef.current.destroy();
        plotRef.current = null;
        setPlot(null);
      }

      if (!canvas) {
        return;
      }

      const newPlot = createPlot(canvas, options);
      plotRef.current = newPlot;
      setPlot(newPlot);
    },
    [options]
  );

  return { plot, attachCanvas };
}
