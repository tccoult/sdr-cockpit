import {
  CursorStyle,
  LegendPosition,
  TooltipMode,
  type AxisConfig,
  type CursorConfig,
  type GridConfig,
  type InteractionsConfig,
  type LegendConfig,
  type MarginsConfig,
  type PlotConfig,
  type TooltipConfig,
} from "./types";


export interface ResolvedPlotConfig {
  axes: {
    x: AxisConfig;
    y: AxisConfig;
  };
  grid: GridConfig;
  interactions: InteractionsConfig;
  margins: MarginsConfig;
  background: string;
  textColor: string;
  fontSize: number;
  fontFamily: string;
  legend: LegendConfig;
  highDPI: boolean;
  maxRenderRate: number;
}
export const DEFAULT_MARGINS: MarginsConfig = {
  top: 20,
  right: 30,
  bottom: 40,
  left: 60,
};

export const DEFAULT_AXIS_CONFIG: AxisConfig = {
  label: "",
  scale: "linear",
};

export const DEFAULT_GRID_CONFIG: GridConfig = {
  show: true,
  color: "rgba(255, 255, 255, 0.08)",
  lineWidth: 1,
  xLines: "auto",
  yLines: "auto",
};

export const DEFAULT_CURSOR_CONFIG: CursorConfig = {
  style: CursorStyle.Crosshair,
  snap: true,
  color: "rgba(255, 255, 255, 0.9)",
  lineWidth: 1,
};

export const DEFAULT_TOOLTIP_CONFIG: TooltipConfig = {
  show: true,
  mode: TooltipMode.Nearest,
  background: "rgba(0, 0, 0, 0.85)",
  textColor: "#ffffff",
  borderRadius: 4,
  padding: 8,
};

export const DEFAULT_INTERACTIONS: InteractionsConfig = {
  zoom: "both",
  pan: "both",
  cursor: { ...DEFAULT_CURSOR_CONFIG },
  tooltip: { ...DEFAULT_TOOLTIP_CONFIG },
  boxSelect: false,
};

export const DEFAULT_LEGEND: LegendConfig = {
  show: false,
  position: LegendPosition.TopRight,
  background: "rgba(0, 0, 0, 0.6)",
  textColor: "#ffffff",
};

export const DEFAULT_PLOT_CONFIG: ResolvedPlotConfig = {
  axes: {
    x: { ...DEFAULT_AXIS_CONFIG },
    y: { ...DEFAULT_AXIS_CONFIG },
  },
  grid: { ...DEFAULT_GRID_CONFIG },
  interactions: { ...DEFAULT_INTERACTIONS },
  margins: { ...DEFAULT_MARGINS },
  background: "rgba(10, 10, 15, 0.8)",
  textColor: "#ffffff",
  fontSize: 12,
  fontFamily: "Inter, sans-serif",
  legend: { ...DEFAULT_LEGEND },
  highDPI: true,
  maxRenderRate: 60,
};

export function mergePlotConfig(config: PlotConfig): ResolvedPlotConfig {
  return {
    axes: {
      x: { ...DEFAULT_AXIS_CONFIG, ...(config.axes?.x ?? {}) },
      y: { ...DEFAULT_AXIS_CONFIG, ...(config.axes?.y ?? {}) },
    },
    grid: { ...DEFAULT_GRID_CONFIG, ...(config.grid ?? {}) },
    interactions: normalizeInteractions(config.interactions),
    margins: { ...DEFAULT_MARGINS, ...(config.margins ?? {}) },
    background: config.background ?? DEFAULT_PLOT_CONFIG.background,
    textColor: config.textColor ?? DEFAULT_PLOT_CONFIG.textColor,
    fontSize: config.fontSize ?? DEFAULT_PLOT_CONFIG.fontSize,
    fontFamily: config.fontFamily ?? DEFAULT_PLOT_CONFIG.fontFamily,
    legend: {
      ...DEFAULT_LEGEND,
      ...(config.legend ?? {}),
      show:
        config.legend && typeof config.legend.show === 'boolean'
          ? config.legend.show
          : DEFAULT_LEGEND.show,
    },
    highDPI: config.highDPI ?? DEFAULT_PLOT_CONFIG.highDPI,
    maxRenderRate: config.maxRenderRate ?? DEFAULT_PLOT_CONFIG.maxRenderRate,
  };
}

function normalizeInteractions(
  interactions: PlotConfig["interactions"]
): InteractionsConfig {
  const merged: InteractionsConfig = { ...DEFAULT_INTERACTIONS };

  if (!interactions) {
    return merged;
  }

  const { zoom, pan, cursor, tooltip, boxSelect } = interactions;

  if (zoom === false) merged.zoom = false;
  else if (zoom === true) merged.zoom = "both";
  else if (zoom) merged.zoom = zoom;

  if (pan === false) merged.pan = false;
  else if (pan === true) merged.pan = "both";
  else if (pan) merged.pan = pan;

  if (typeof cursor === 'boolean') {
    merged.cursor = cursor ? { ...DEFAULT_CURSOR_CONFIG } : null;
  } else if (cursor === undefined) {
    merged.cursor = { ...DEFAULT_CURSOR_CONFIG };
  } else if (typeof cursor === 'string') {
    merged.cursor = {
      ...DEFAULT_CURSOR_CONFIG,
      style: cursor,
    };
  } else {
    merged.cursor = { ...DEFAULT_CURSOR_CONFIG, ...cursor };
  }

  if (typeof tooltip === 'boolean') {
    merged.tooltip = tooltip ? { ...DEFAULT_TOOLTIP_CONFIG } : null;
  } else if (tooltip === undefined) {
    merged.tooltip = { ...DEFAULT_TOOLTIP_CONFIG };
  } else if (typeof tooltip === 'string') {
    merged.tooltip = {
      ...DEFAULT_TOOLTIP_CONFIG,
      mode: tooltip as TooltipMode,
    };
  } else {
    merged.tooltip = { ...DEFAULT_TOOLTIP_CONFIG, ...tooltip };
  }

  if (typeof boxSelect === "boolean") {
    merged.boxSelect = boxSelect;
  }

  return merged;
}
