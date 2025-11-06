import type { AxisRange, Viewport } from "../types";

export interface PanState {
  active: boolean;
  pointerId: number | null;
  startX: number;
  startY: number;
  viewportWidth: number;
  viewportHeight: number;
  startRangeX: [number, number];
  startRangeY: [number, number];
}

export interface BoxSelectState {
  active: boolean;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface PanUpdateResult {
  x?: AxisRange;
  y?: AxisRange;
}

export interface BoxFinalizeResult {
  x: AxisRange;
  y: AxisRange;
}

export type SelectionMode = "x" | "xy";

export interface BoxOverlay {
  active: boolean;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  mode: SelectionMode;
}

export interface BoxInteraction {
  state: BoxSelectState;
  pointerId: number | null;
  overlay: BoxOverlay;
}

export function createPanState(): PanState {
  return {
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    viewportWidth: 1,
    viewportHeight: 1,
    startRangeX: [0, 1],
    startRangeY: [0, 1],
  };
}

export function createBoxState(): BoxSelectState {
  return {
    active: false,
    x0: 0,
    y0: 0,
    x1: 0,
    y1: 0,
  };
}

export function createBoxInteraction(): BoxInteraction {
  return {
    state: createBoxState(),
    pointerId: null,
    overlay: {
      active: false,
      x0: 0,
      y0: 0,
      x1: 0,
      y1: 0,
      mode: "x",
    },
  };
}

export function beginPan(
  state: PanState,
  pointerId: number,
  px: number,
  py: number,
  viewport: Viewport,
  ranges: { x: AxisRange; y: AxisRange }
): void {
  state.active = true;
  state.pointerId = pointerId;
  state.startX = px;
  state.startY = py;
  state.viewportWidth = Math.max(1, viewport.rect.width);
  state.viewportHeight = Math.max(1, viewport.rect.height);
  state.startRangeX = [ranges.x.min, ranges.x.max];
  state.startRangeY = [ranges.y.min, ranges.y.max];
}

export function updatePan(
  state: PanState,
  px: number,
  py: number,
  options: { allowX: boolean; allowY: boolean }
): PanUpdateResult {
  if (!state.active) {
    return {};
  }
  const result: PanUpdateResult = {};

  if (options.allowX && state.viewportWidth > 0) {
    const spanX = state.startRangeX[1] - state.startRangeX[0];
    const deltaPx = px - state.startX;
    const domainShift = (deltaPx / state.viewportWidth) * spanX;
    result.x = {
      min: state.startRangeX[0] - domainShift,
      max: state.startRangeX[1] - domainShift,
    };
  }

  if (options.allowY && state.viewportHeight > 0) {
    const spanY = state.startRangeY[1] - state.startRangeY[0];
    const deltaPy = py - state.startY;
    const domainShift = (deltaPy / state.viewportHeight) * spanY;
    result.y = {
      min: state.startRangeY[0] + domainShift,
      max: state.startRangeY[1] + domainShift,
    };
  }

  return result;
}

export function endPan(state: PanState): void {
  state.active = false;
  state.pointerId = null;
}

export function beginBox(
  state: BoxSelectState,
  px: number,
  py: number
): void {
  state.active = true;
  state.x0 = px;
  state.y0 = py;
  state.x1 = px;
  state.y1 = py;
}

export function updateBox(
  state: BoxSelectState,
  px: number,
  py: number
): void {
  if (!state.active) return;
  state.x1 = px;
  state.y1 = py;
}

export function finishBox(
  state: BoxSelectState,
  viewport: Viewport
): BoxFinalizeResult | null {
  if (!state.active) return null;
  state.active = false;
  const minX = Math.min(state.x0, state.x1);
  const maxX = Math.max(state.x0, state.x1);
  const minY = Math.min(state.y0, state.y1);
  const maxY = Math.max(state.y0, state.y1);
  const rect = viewport.rect;
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  const xMin = viewport.invertX(minX);
  const xMax = viewport.invertX(maxX);
  const yMax = viewport.invertY(minY);
  const yMin = viewport.invertY(maxY);
  return {
    x: {
      min: Math.min(xMin, xMax),
      max: Math.max(xMin, xMax),
    },
    y: {
      min: Math.min(yMin, yMax),
      max: Math.max(yMin, yMax),
    },
  };
}

export function startBoxInteraction(
  interaction: BoxInteraction,
  pointerId: number,
  px: number,
  py: number,
  mode: SelectionMode
): void {
  interaction.pointerId = pointerId;
  interaction.overlay = {
    active: true,
    x0: px,
    y0: py,
    x1: px,
    y1: py,
    mode,
  };
  beginBox(interaction.state, px, py);
}

export function updateBoxInteraction(
  interaction: BoxInteraction,
  px: number,
  py: number
): void {
  updateBox(interaction.state, px, py);
  interaction.overlay = {
    ...interaction.overlay,
    active: interaction.state.active,
    x1: px,
    y1: py,
  };
}

export function finishBoxInteraction(
  interaction: BoxInteraction,
  viewport: Viewport
): BoxFinalizeResult | null {
  const result = finishBox(interaction.state, viewport);
  interaction.overlay = {
    ...interaction.overlay,
    active: false,
  };
  interaction.pointerId = null;
  return result;
}

export function cancelBoxInteraction(interaction: BoxInteraction): void {
  interaction.state.active = false;
  interaction.pointerId = null;
  interaction.overlay = {
    ...interaction.overlay,
    active: false,
  };
}
