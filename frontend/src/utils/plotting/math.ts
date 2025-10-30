export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function calculateTicks(
  min: number,
  max: number,
  targetCount: number
): number[] {
  if (!isFinite(min) || !isFinite(max) || min === max) {
    return [min];
  }
  const range = max - min;
  const roughStep = range / Math.max(1, targetCount - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(roughStep, 1e-12))));
  const residual = roughStep / magnitude;

  let step: number;
  if (residual >= 5) step = 10 * magnitude;
  else if (residual >= 2) step = 5 * magnitude;
  else if (residual >= 1) step = 2 * magnitude;
  else step = magnitude;

  const ticks: number[] = [];
  const start = Math.ceil(min / step) * step;
  for (let tick = start; tick <= max; tick += step) {
    ticks.push(Number(tick.toFixed(12)));
  }
  if (ticks.length === 0) {
    ticks.push(min, max);
  }
  return ticks;
}

export function arrayMinMax(values: ArrayLike<number>): {
  min: number;
  max: number;
} | null {
  const length = values.length;
  if (length === 0) {
    return null;
  }
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < length; i += 1) {
    const value = values[i];
    if (!Number.isFinite(value)) {
      continue;
    }
    if (value < min) min = value;
    if (value > max) max = value;
  }
  if (min === Infinity || max === -Infinity) {
    return null;
  }
  return { min, max };
}

export function normalizePadding(padding: number | undefined): number {
  return typeof padding === "number" && Number.isFinite(padding) && padding > 0
    ? padding
    : 0;
}

export function withPadding(range: { min: number; max: number }, padding: number) {
  if (padding <= 0) {
    return range;
  }
  const span = range.max - range.min;
  const delta = span * padding;
  return { min: range.min - delta, max: range.max + delta };
}
