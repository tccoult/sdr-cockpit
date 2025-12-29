import { useEffect, useState } from "react";
import type { PlotHandle, PlotRenderStats } from "../plot";

const FPS_DECIMAL_PLACES = 1;

const round = (value: number, precision: number) => {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
};

export function usePlotRenderFps(plot: PlotHandle | null): number {
  const [fps, setFps] = useState(0);

  useEffect(() => {
    if (!plot || plot.isDestroyed()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset on plot destruction
      setFps(0);
      return;
    }

    const handleStats = (stats: PlotRenderStats) => {
      if (!Number.isFinite(stats.fps)) {
        setFps(0);
        return;
      }
      setFps((prev) => {
        const next = round(stats.fps, FPS_DECIMAL_PLACES);
        return Math.abs(prev - next) < 0.01 ? prev : next;
      });
    };

    const unsubscribe = plot.onFrame(handleStats);
    return () => {
      unsubscribe();
      setFps(0);
    };
  }, [plot]);

  return fps;
}

