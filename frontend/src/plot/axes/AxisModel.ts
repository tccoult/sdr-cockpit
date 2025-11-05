import { computeTicks } from "../math/ticks";
import type { AxisOptions, AxisScaleKind, Range, Tick } from "./axisTypes";

const DEFAULT_TARGET_TICKS = 8;
const MIN_SPAN = 1e-12;

export interface AxisModelInit extends AxisOptions {
  ticksCacheKey?: string;
}

export class AxisModel {
  private readonly scale: AxisScaleKind;
  private readonly formatter?: (value: number) => string;
  private readonly targetTicks: number;

  private range: Range = [0, 1];
  private spanPx = 1;
  private cachedTicks: Tick[] = [];
  private cacheKey = "";

  constructor(options: AxisOptions) {
    this.scale = options.scale ?? "linear";
    this.formatter = options.format;
    this.targetTicks = Math.max(2, Math.round(options.ticksTarget ?? DEFAULT_TARGET_TICKS));
  }

  setRange(range: Range) {
    this.range = normalizeRange(range);
    this.invalidate();
  }

  setSpanPx(spanPx: number) {
    this.spanPx = Math.max(1, spanPx);
    this.invalidate();
  }

  ticks(): Tick[] {
    const cacheKey = `${this.range[0]}|${this.range[1]}|${this.spanPx}|${this.scale}|${this.targetTicks}`;
    if (cacheKey === this.cacheKey && this.cachedTicks.length > 0) {
      return this.cachedTicks;
    }

    const [min, max] = this.range;
    const tickCount = this.targetTicks;
    const font = "12px sans-serif";
    const values = computeTicks({
      min,
      max,
      count: tickCount,
      font,
    });

    const ticks: Tick[] = values.map((value) => ({
      value,
      label: this.format(value),
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

  private format(value: number): string {
    if (this.formatter) {
      try {
        return this.formatter(value);
      } catch (error) {
        if (import.meta.env.MODE !== "production") {
          console.warn("[plot] axis formatter threw", error);
        }
      }
    }
    return defaultFormat(value);
  }

  private valueToPx(value: number): number {
    const [min, max] = this.range;
    const span = max - min || MIN_SPAN;
    return ((value - min) / span) * this.spanPx;
  }
}

function normalizeRange(range: Range): Range {
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
