const SECOND_MS = 1_000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const YEAR_MS = 365 * DAY_MS;

const TIME_INTERVALS_MS = [
  0.1,
  0.2,
  0.5,
  1,
  2,
  5,
  10,
  20,
  50,
  100,
  200,
  500,
  1_000,
  2_000,
  5_000,
  10_000,
  15_000,
  30_000,
  60_000,
  120_000,
  300_000,
  600_000,
  900_000,
  1_800_000,
  3_600_000,
  7_200_000,
  10_800_000,
  18_000_000,
  36_000_000,
  86_400_000,
  172_800_000,
  604_800_000,
  1_209_600_000,
  2_592_000_000,
  7_776_000_000,
  15_552_000_000,
  31_536_000_000,
  63_072_000_000,
  157_680_000_000,
  315_360_000_000,
];

export interface TickCacheKey {
  min: number;
  max: number;
  count: number;
  font: string;
}

const cache = new Map<string, number[]>();

const keyOf = (key: TickCacheKey) =>
  `${key.min}|${key.max}|${key.count}|${key.font}`;

export function computeTicks(key: TickCacheKey): number[] {
  const serialized = keyOf(key);
  const cached = cache.get(serialized);
  if (cached) {
    return cached;
  }
  const ticks = generateNiceTicks(key.min, key.max, key.count);
  cache.set(serialized, ticks);
  return ticks;
}

export function computeLogTicks(
  min: number,
  max: number,
  targetCount: number
): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0) {
    return [];
  }
  if (min === max) {
    return [min];
  }
  const safeMin = Math.min(min, max);
  const safeMax = Math.max(min, max);
  const logMin = Math.log10(safeMin);
  const logMax = Math.log10(safeMax);
  const mantissaSets: number[][] = [
    [1],
    [1, 2, 5],
    [1, 2, 3, 5, 7],
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
  ];

  for (let i = 0; i < mantissaSets.length; i += 1) {
    const mantissas = mantissaSets[i];
    const ticks: number[] = [];
    const minExp = Math.floor(logMin);
    const maxExp = Math.ceil(logMax);
    for (let exp = minExp; exp <= maxExp; exp += 1) {
      const scale = Math.pow(10, exp);
      for (const mantissa of mantissas) {
        const value = mantissa * scale;
        if (value < safeMin || value > safeMax) continue;
        ticks.push(value);
      }
    }
    ticks.sort((a, b) => a - b);
    dedupeSorted(ticks);
    ensureRangeAnchors(ticks, safeMin, safeMax);
    if (ticks.length >= targetCount || i === mantissaSets.length - 1) {
      return ticks;
    }
  }
  return [];
}

export function computeTimeTicks(
  min: number,
  max: number,
  targetCount: number
): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    return [min];
  }
  const safeMin = Math.min(min, max);
  const safeMax = Math.max(min, max);
  const span = safeMax - safeMin;
  const desired = Math.max(1, targetCount);
  const approxStep = span / desired;
  const interval = pickTimeInterval(approxStep);
  const first = alignToInterval(safeMin, interval, true);
  const ticks: number[] = [];
  const epsilon = interval * 1e-6;
  for (let value = first; value <= safeMax + epsilon; value += interval) {
    ticks.push(Number.parseFloat(value.toPrecision(15)));
    if (ticks.length > desired * 8) {
      break;
    }
  }
  ensureRangeAnchors(ticks, safeMin, safeMax);
  return ticks;
}

export function clearTickCache() {
  cache.clear();
}

function generateNiceTicks(min: number, max: number, targetCount: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    return [min];
  }
  const span = max - min;
  const desiredCount = Math.max(1, targetCount);
  const rawStep = span / desiredCount;
  const niceStep = computeNiceStep(rawStep);
  const ticks: number[] = [];
  const epsilon = niceStep * 1e-6;
  const firstTick = Math.ceil((min - epsilon) / niceStep) * niceStep;
  for (let value = firstTick; value <= max + epsilon; value += niceStep) {
    ticks.push(Number.parseFloat(value.toPrecision(12)));
  }
  if (ticks.length === 0) {
    ticks.push(min, max);
  }
  return ticks;
}

function computeNiceStep(step: number): number {
  if (!Number.isFinite(step) || step === 0) {
    return 1;
  }
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(step))));
  const residual = Math.abs(step) / magnitude;
  let niceResidual: number;
  if (residual < 1.5) {
    niceResidual = 1;
  } else if (residual < 3) {
    niceResidual = 2;
  } else if (residual < 7) {
    niceResidual = 5;
  } else {
    niceResidual = 10;
  }
  return Math.sign(step) * niceResidual * magnitude;
}

function dedupeSorted(values: number[]) {
  if (values.length <= 1) {
    return;
  }
  let write = 1;
  for (let i = 1; i < values.length; i += 1) {
    if (Math.abs(values[i] - values[write - 1]) > Number.EPSILON * 10) {
      values[write] = values[i];
      write += 1;
    }
  }
  values.length = write;
}

function ensureRangeAnchors(ticks: number[], min: number, max: number) {
  if (ticks.length === 0) {
    ticks.push(min, max);
    ticks.sort((a, b) => a - b);
    return;
  }
  const first = ticks[0];
  if (Math.abs(first - min) > Math.abs(min) * 1e-9) {
    ticks.unshift(min);
  } else {
    ticks[0] = min;
  }
  const lastIndex = ticks.length - 1;
  const last = ticks[lastIndex];
  if (Math.abs(last - max) > Math.abs(max) * 1e-9) {
    ticks.push(max);
  } else {
    ticks[lastIndex] = max;
  }
}

function pickTimeInterval(approxStep: number): number {
  if (!Number.isFinite(approxStep) || approxStep <= 0) {
    return 1;
  }
  for (const interval of TIME_INTERVALS_MS) {
    if (interval >= approxStep) {
      return interval;
    }
  }
  const years = Math.ceil(approxStep / YEAR_MS);
  return years * YEAR_MS;
}

function alignToInterval(value: number, interval: number, ceil = false): number {
  if (interval === 0) return value;
  const factor = value / interval;
  const aligned = ceil ? Math.ceil(factor) : Math.floor(factor);
  return aligned * interval;
}
