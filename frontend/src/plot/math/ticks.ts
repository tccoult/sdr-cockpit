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
