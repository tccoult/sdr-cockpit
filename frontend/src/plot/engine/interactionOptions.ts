import {
  BoxZoomMode,
  BoxZoomModifierSetting,
  CursorStyle,
  PlotInteractionsOptions,
  PlotTheme,
} from "../types";
import type { AxisTheme } from "../axes/axisTypes";

export type ResolvedInteractions = {
  panX: boolean;
  panY: boolean;
  zoomX: boolean;
  zoomY: boolean;
  zoomFactor: number;
  cursor: boolean;
  cursorStyle: CursorStyle;
  boxZoom: {
    enabled: boolean;
    mode: BoxZoomMode;
    modifier: BoxZoomModifierSetting;
  };
};

export const DEFAULT_ZOOM_FACTOR = 0.2;

export const FALLBACK_THEME: PlotTheme = {
  background: "rgba(10, 10, 15, 0.85)",
  gridColor: "rgba(255, 255, 255, 0.1)",
  axisColor: "rgba(255, 255, 255, 0.4)",
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 12,
  textColor: "#ffffff",
  axisLineWidth: 1,
  axisLabelPadding: 18,
  axisTickLabelPadding: 6,
  cursorLineColor: "rgba(255, 255, 255, 0.7)",
  cursorHighlightColor: "#ffff7a",
};

export function toAxisTheme(theme: PlotTheme): AxisTheme {
  return {
    axisColor: theme.axisColor,
    gridColor: theme.gridColor,
    textColor: theme.textColor,
    font: `${theme.fontSize}px ${theme.fontFamily}`,
    lineWidth: theme.axisLineWidth,
    labelPaddingPx: theme.axisLabelPadding,
    tickLabelPaddingPx: theme.axisTickLabelPadding,
  };
}

export function resolveInteractions(
  options: PlotInteractionsOptions | undefined
): ResolvedInteractions {
  const panOption = options?.pan;
  let panX: boolean;
  let panY: boolean;
  if (typeof panOption === "boolean") {
    panX = panOption;
    panY = panOption;
  } else if (panOption) {
    panX = panOption.x !== false;
    panY = panOption.y !== false;
  } else {
    panX = true;
    panY = true;
  }

  const zoomOption = options?.zoom;
  let zoomX: boolean;
  let zoomY: boolean;
  let zoomFactor = DEFAULT_ZOOM_FACTOR;
  if (typeof zoomOption === "boolean") {
    zoomX = zoomOption;
    zoomY = zoomOption;
  } else if (zoomOption) {
    zoomX = zoomOption.x !== false;
    zoomY = zoomOption.y !== false;
    if (zoomOption.factor !== undefined && zoomOption.factor > 0) {
      zoomFactor = zoomOption.factor;
    }
  } else {
    zoomX = true;
    zoomY = true;
  }

  const cursorOption = options?.cursor;
  let cursorEnabled: boolean;
  let cursorStyle: CursorStyle = "crosshair";
  if (typeof cursorOption === "boolean") {
    cursorEnabled = cursorOption;
  } else if (cursorOption) {
    cursorEnabled = cursorOption.enabled !== false;
    if (cursorOption.style) {
      cursorStyle = cursorOption.style;
    }
  } else {
    cursorEnabled = true;
  }
  if (!cursorEnabled) {
    cursorStyle = "none";
  }

  const boxZoomOption = options?.boxZoom;
  let boxZoomEnabled = false;
  let boxZoomMode: BoxZoomMode = "auto";
  let boxZoomModifier: BoxZoomModifierSetting = "shift";
  if (typeof boxZoomOption === "boolean") {
    boxZoomEnabled = boxZoomOption;
  } else if (boxZoomOption) {
    boxZoomEnabled = true;
    if (
      boxZoomOption.mode === "x" ||
      boxZoomOption.mode === "xy" ||
      boxZoomOption.mode === "auto"
    ) {
      boxZoomMode = boxZoomOption.mode;
    }
    if (
      boxZoomOption.modifier === "shift" ||
      boxZoomOption.modifier === "ctrl" ||
      boxZoomOption.modifier === "alt" ||
      boxZoomOption.modifier === "meta" ||
      boxZoomOption.modifier === "none"
    ) {
      boxZoomModifier = boxZoomOption.modifier;
    }
  }

  return {
    panX,
    panY,
    zoomX,
    zoomY,
    zoomFactor,
    cursor: cursorEnabled,
    cursorStyle,
    boxZoom: {
      enabled: boxZoomEnabled,
      mode: boxZoomMode,
      modifier: boxZoomModifier,
    },
  };
}
