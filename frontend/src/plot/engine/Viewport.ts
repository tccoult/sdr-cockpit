import { normalizeRange } from "../math";
import type { AxisRange, Viewport, ViewportOptions } from "../types";
import { createDomRect } from "./domRect";

const DEFAULT_RANGE: AxisRange = { min: 0, max: 1 };

/**
 * Default margins for axes and labels (in CSS pixels).
 * These can be overridden via ViewportOptions.
 */
export const DEFAULT_PLOT_MARGINS = {
  left: 70,
  right: 15,
  top: 15,
  bottom: 50,
} as const;

export function createViewport(options: ViewportOptions): Viewport {
  let rect: DOMRectReadOnly = createDomRect(0, 0, 1, 1);
  let xRange = normalizeRange(options.initialXRange, DEFAULT_RANGE);
  let yRange = normalizeRange(options.initialYRange, DEFAULT_RANGE);

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
          : {
              width: canvas.width / Math.max(1, dpr),
              height: canvas.height / Math.max(1, dpr),
            };
      const cssWidth =
        rectLike.width > 0 ? rectLike.width : canvas.width / Math.max(1, dpr);
      const cssHeight =
        rectLike.height > 0
          ? rectLike.height
          : canvas.height / Math.max(1, dpr);

      // Apply margins for axes and labels (can be overridden via options)
      const margins = options.margins ?? DEFAULT_PLOT_MARGINS;
      const plotLeft = margins.left;
      const plotTop = margins.top;
      const plotWidth = Math.max(1, cssWidth - margins.left - margins.right);
      const plotHeight = Math.max(1, cssHeight - margins.top - margins.bottom);

      rect = createDomRect(plotLeft, plotTop, plotWidth, plotHeight);
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
