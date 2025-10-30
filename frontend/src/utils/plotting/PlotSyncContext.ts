import { createContext, useContext } from "react";

import type { PlotRuntime } from "./core";

export interface PlotSyncContextValue {
  registerPlot: (runtime: PlotRuntime) => () => void;
}

export const PlotSyncContext = createContext<PlotSyncContextValue | null>(null);

export function usePlotSyncContext() {
  return useContext(PlotSyncContext);
}
