import {
  computeLogTicks,
  computeTicks,
  computeTimeTicks,
} from "../math/ticks";
import type { AxisOptions, AxisScaleKind, Range, Tick } from "./axisTypes";

const DEFAULT_TARGET_TICKS = 8;
const MIN_SPAN = 1e-12;
const MIN_LOG_VALUE = 1e-12;
const SECOND_MS = 1_000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export interface AxisModelInit extends AxisOptions {
  ticksCacheKey?: string;
  themeFont?: string;
}

export class AxisModel {
  private readonly scale: AxisScaleKind;
  private readonly formatter?: (value: number) => string;
  private readonly targetTicks: number;
  private readonly font: string;
  private readonly side: string;

  private range: Range = [0, 1];
  private spanPx = 1;
  private cachedTicks: Tick[] = [];
  private cacheKey = "";
  private logRange: Range | null = null;
  private static textMeasureCanvas: HTMLCanvasElement | null = null;
  private static textMeasureContext: CanvasRenderingContext2D | null = null;

  constructor(options: AxisOptions & { themeFont?: string }) {
    this.scale = options.scale ?? "linear";
    this.formatter = options.format;
    this.targetTicks = Math.max(2, Math.round(options.ticksTarget ?? DEFAULT_TARGET_TICKS));
    this.font = options.themeFont ?? "12px sans-serif";
    this.side = options.side ?? "bottom";
  }

  setRange(range: Range) {
    this.range = normalizeRange(range, this.scale);
    if (this.scale === "log") {
      const [min, max] = this.range;
      const safeMin = Math.max(min, MIN_LOG_VALUE);
      const safeMax = Math.max(max, safeMin * (1 + MIN_SPAN));
      this.logRange = [Math.log(safeMin), Math.log(safeMax)];
    } else {
      this.logRange = null;
    }
    this.invalidate();
  }

  setSpanPx(spanPx: number) {
    this.spanPx = Math.max(1, spanPx);
    this.invalidate();
  }

  /**
   * Get a canvas context for measuring text dimensions
   */
  private getTextMeasureContext(): CanvasRenderingContext2D {
    if (!AxisModel.textMeasureContext) {
      if (typeof document !== 'undefined') {
        AxisModel.textMeasureCanvas = document.createElement('canvas');
        AxisModel.textMeasureContext = AxisModel.textMeasureCanvas.getContext('2d');
      }
    }
    return AxisModel.textMeasureContext!;
  }

  /**
   * Estimate the typical width of axis labels in pixels
   */
  private estimateLabelWidth(): number {
    const ctx = this.getTextMeasureContext();
    if (!ctx) {
      // Fallback estimate if canvas not available (e.g., SSR)
      return 60;
    }

    ctx.font = this.font;

    // Sample a few values across the range to estimate typical label width
    const sampleCount = 5;
    let maxWidth = 0;

    for (let i = 0; i < sampleCount; i++) {
      const ratio = i / (sampleCount - 1);
      const value = this.range[0] + ratio * (this.range[1] - this.range[0]);
      const label = this.format(value, (this.range[1] - this.range[0]) / this.targetTicks);
      const width = ctx.measureText(label).width;
      maxWidth = Math.max(maxWidth, width);
    }

    return maxWidth || 60; // Fallback to 60px if measurement fails
  }

  /**
   * Calculate the optimal number of ticks based on available space
   * Applies to both horizontal (width-based) and vertical (height-based) axes
   */
  private getOptimalTickCount(): number {
    const isHorizontal = this.side === 'bottom' || this.side === 'top';
    const isVertical = this.side === 'left' || this.side === 'right';

    if (!isHorizontal && !isVertical) {
      return this.targetTicks;
    }

    if (isHorizontal) {
      // For horizontal axes, check label width
      const labelWidth = this.estimateLabelWidth();
      const tickLabelPadding = 6; // Default padding from theme
      const minSpacing = labelWidth + tickLabelPadding * 2;
      const maxTicks = Math.floor(this.spanPx / (minSpacing * 1.3));
      return Math.max(2, Math.min(this.targetTicks, maxTicks));
    } else {
      // For vertical axes, check label height
      const fontSize = parseInt(this.font) || 12;
      const labelHeight = fontSize;
      const tickLabelPadding = 6; // Default padding from theme
      const minSpacing = labelHeight + tickLabelPadding * 2;
      // Use a spacing factor of 1.5 for vertical to ensure good readability
      const maxTicks = Math.floor(this.spanPx / (minSpacing * 1.5));
      return Math.max(2, Math.min(this.targetTicks, maxTicks));
    }
  }

  ticks(): Tick[] {
    const cacheKey = `${this.range[0]}|${this.range[1]}|${this.spanPx}|${this.scale}|${this.targetTicks}|${this.font}`;
    if (cacheKey === this.cacheKey && this.cachedTicks.length > 0) {
      return this.cachedTicks;
    }

    const values = this.computeTickValues();
    const spacing =
      values.length >= 2 ? values[1] - values[0] : this.range[1] - this.range[0];

    const ticks: Tick[] = values.map((value) => ({
      value,
      label: this.format(value, spacing),
      px: this.valueToPx(value),
    }));

    this.cacheKey = cacheKey;
    this.cachedTicks = ticks;
    return ticks;
  }

  private invalidate() {
    this.cacheKey = "";
    this.cachedTicks = [];
  }

  pxToValue(px: number): number {
    const clamped = Math.max(0, Math.min(this.spanPx, px));
    const ratio = clamped / (this.spanPx || 1);
    if (this.scale === "log" && this.logRange) {
      const [logMin, logMax] = this.logRange;
      const logSpan = logMax - logMin || MIN_SPAN;
      const logValue = logMin + ratio * logSpan;
      return Math.exp(logValue);
    }
    const [min, max] = this.range;
    const span = max - min || MIN_SPAN;
    return min + ratio * span;
  }

  private computeTickValues(): number[] {
    const [min, max] = this.range;
    const optimalCount = this.getOptimalTickCount();

    if (this.scale === "log") {
      const ticks = computeLogTicks(min, max, optimalCount);
      if (ticks.length > 0) {
        return ticks;
      }
    } else if (this.scale === "time") {
      const timeTicks = computeTimeTicks(min, max, optimalCount);
      if (timeTicks.length > 0) {
        return timeTicks;
      }
    }
    return computeTicks({
      min,
      max,
      count: optimalCount,
      font: this.font,
    });
  }

  private format(value: number, spacing: number): string {
    if (this.formatter) {
      try {
        return this.formatter(value);
      } catch (error) {
        if (import.meta.env.MODE !== "production") {
          console.warn("[plot] axis formatter threw", error);
        }
      }
    }
    if (this.scale === "time") {
      return defaultTimeFormat(value, spacing, this.range);
    }
    return defaultFormat(value);
  }

  private valueToPx(value: number): number {
    if (this.scale === "log" && this.logRange) {
      if (!Number.isFinite(value) || value <= 0) {
        return 0;
      }
      const [logMin, logMax] = this.logRange;
      const logSpan = logMax - logMin || MIN_SPAN;
      const clamped = Math.min(Math.max(Math.log(value), logMin), logMax);
      return ((clamped - logMin) / logSpan) * this.spanPx;
    }
    const [min, max] = this.range;
    const span = max - min || MIN_SPAN;
    return ((value - min) / span) * this.spanPx;
  }
}

function normalizeRange(range: Range, scale: AxisScaleKind): Range {
  if (scale === "log") {
    return normalizeLogRange(range);
  }
  return normalizeLinearRange(range);
}

function normalizeLinearRange(range: Range): Range {
  let [min, max] = range;
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 1;
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
  return [min, max];
}

function normalizeLogRange(range: Range): Range {
  let [min, max] = range;
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= 0) {
    min = 1;
    max = 10;
  }
  min = Math.max(min, MIN_LOG_VALUE);
  max = Math.max(max, min * (1 + MIN_SPAN));
  if (min > max) {
    const tmp = min;
    min = max;
    max = tmp;
  }
  return [min, max];
}

function defaultFormat(value: number): string {
  if (!Number.isFinite(value)) return "";
  const abs = Math.abs(value);
  if (abs >= 1e6 || (abs > 0 && abs < 1e-3)) {
    return value.toExponential(2);
  }
  if (abs >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  if (abs >= 100) {
    return value.toFixed(1);
  }
  if (abs >= 1) {
    return value.toFixed(2);
  }
  return value.toPrecision(2);
}

function defaultTimeFormat(value: number, spacing: number, range: Range): string {
  if (!Number.isFinite(value)) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const span = Math.max(Math.abs(range[1] - range[0]), spacing);
  const absSpacing = Math.max(Math.abs(spacing), 0);
  const includeDate = span >= DAY_MS;

  const hours = pad(date.getUTCHours(), 2);
  const minutes = pad(date.getUTCMinutes(), 2);
  const seconds = pad(date.getUTCSeconds(), 2);
  const millis = pad(date.getUTCMilliseconds(), 3);

  let timePart: string;
  if (absSpacing >= DAY_MS) {
    timePart = "";
  } else if (absSpacing >= HOUR_MS) {
    timePart = `${hours}:${minutes}`;
  } else if (absSpacing >= MINUTE_MS) {
    timePart = `${hours}:${minutes}`;
  } else if (absSpacing >= SECOND_MS) {
    timePart = `${hours}:${minutes}:${seconds}`;
  } else {
    timePart = `${hours}:${minutes}:${seconds}.${millis}`;
  }

  const datePart = `${date.getUTCFullYear()}-${pad(
    date.getUTCMonth() + 1,
    2
  )}-${pad(date.getUTCDate(), 2)}`;

  if (includeDate && timePart) {
    return `${datePart} ${timePart}`;
  }
  if (includeDate) {
    return datePart;
  }
  return timePart || datePart;
}

function pad(value: number, width: number): string {
  const str = `${Math.trunc(Math.abs(value))}`;
  if (str.length >= width) {
    return str;
  }
  return `${"0".repeat(width - str.length)}${str}`;
}
