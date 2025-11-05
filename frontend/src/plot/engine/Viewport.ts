import type { AxisRange, Viewport, ViewportOptions } from "../types";

const DEFAULT_RANGE: AxisRange = { min: 0, max: 1 };
const MIN_SPAN = 1e-12;

export function createViewport(options: ViewportOptions): Viewport {
  let rect: DOMRectReadOnly = new DOMRectReadOnly(0, 0, 1, 1);
  let xRange = normalizeRange(options.initialXRange ?? DEFAULT_RANGE);
  let yRange = normalizeRange(options.initialYRange ?? DEFAULT_RANGE);

  let spanX = xRange.max - xRange.min;
  let spanY = yRange.max - yRange.min;
  let scaleX = rect.width / spanX;
  let scaleY = rect.height / spanY;

  const updateScale = () => {
    spanX = xRange.max - xRange.min;
    spanY = yRange.max - yRange.min;
    scaleX = rect.width / spanX;
    scaleY = rect.height / spanY;
  };

  const projectX = (value: number) => rect.left + (value - xRange.min) * scaleX;
  const projectY = (value: number) =>
    rect.top + rect.height - (value - yRange.min) * scaleY;
  const invertX = (pixel: number) =>
    xRange.min + ((pixel - rect.left) / rect.width) * spanX;
  const invertY = (pixel: number) =>
    yRange.max - ((pixel - rect.top) / rect.height) * spanY;

  return {
    get projectX() {
      return projectX;
    },
    get projectY() {
      return projectY;
    },
    get invertX() {
      return invertX;
    },
    get invertY() {
      return invertY;
    },
    get rect() {
      return rect;
    },
    get xRange() {
      return xRange;
    },
    get yRange() {
      return yRange;
    },
    updateDimensions(canvas: HTMLCanvasElement, dpr: number) {
      const rectLike =
        typeof canvas.getBoundingClientRect === "function"
          ? canvas.getBoundingClientRect()
          : { width: canvas.width / Math.max(1, dpr), height: canvas.height / Math.max(1, dpr) };
      const cssWidth =
        rectLike.width > 0 ? rectLike.width : canvas.width / Math.max(1, dpr);
      const cssHeight =
        rectLike.height > 0 ? rectLike.height : canvas.height / Math.max(1, dpr);
      rect = new DOMRectReadOnly(0, 0, cssWidth, cssHeight);
      updateScale();
    },
    setXRange(range: AxisRange) {
      xRange = normalizeRange(range);
      updateScale();
    },
    setYRange(range: AxisRange) {
      yRange = normalizeRange(range);
      updateScale();
    },
  };
}

function normalizeRange(range: AxisRange): AxisRange {
  let { min, max } = range;
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = DEFAULT_RANGE.min;
    max = DEFAULT_RANGE.max;
  }
  if (min > max) {
    const tmp = min;
    min = max;
    max = tmp;
  }
  if (max - min < MIN_SPAN) {
    const pad = min === 0 ? MIN_SPAN : Math.abs(min) * 1e-6;
    min -= pad;
    max += pad;
  }
  return { min, max };
}
