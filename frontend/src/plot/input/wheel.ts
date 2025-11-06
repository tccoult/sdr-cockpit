import type { AxisRange, Viewport } from "../types";

export interface WheelInput {
  px: number;
  py: number;
  deltaY: number;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}

export interface WheelOptions {
  enableX: boolean;
  enableY: boolean;
  zoomFactor?: number;
  minSpanRatio?: number;
}

export interface WheelResult {
  x?: AxisRange;
  y?: AxisRange;
}

const MIN_SPAN = 1e-6;

export function applyWheel(
  input: WheelInput,
  viewport: Viewport,
  ranges: { x: AxisRange; y: AxisRange },
  options: WheelOptions
): WheelResult {
  const factorBase = options.zoomFactor ?? 0.1;
  const spanRatio = options.minSpanRatio ?? 1e-6;

  const result: WheelResult = {};

  const zoomAmount = Math.pow(1 + factorBase, input.deltaY / 100);

  if (options.enableX) {
    const span = ranges.x.max - ranges.x.min || MIN_SPAN;
    const minSpan = Math.max(MIN_SPAN, span * spanRatio);
    const newSpan = clampSpan(span * zoomAmount, minSpan);
    const anchor = viewport.invertX(input.px);
    const t = (anchor - ranges.x.min) / span;
    const min = anchor - t * newSpan;
    result.x = { min, max: min + newSpan };
  }

  if (options.enableY) {
    const span = ranges.y.max - ranges.y.min || MIN_SPAN;
    const minSpan = Math.max(MIN_SPAN, span * spanRatio);
    const newSpan = clampSpan(span * zoomAmount, minSpan);
    const anchor = viewport.invertY(input.py);
    const t = (anchor - ranges.y.min) / span;
    const min = anchor - t * newSpan;
    result.y = { min, max: min + newSpan };
  }

  return result;
}

function clampSpan(span: number, minSpan: number): number {
  if (!Number.isFinite(span) || span <= 0) {
    return minSpan;
  }
  return Math.max(minSpan, span);
}
