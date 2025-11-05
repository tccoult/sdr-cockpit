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
  // Placeholder tick computation - to be replaced with nice tick logic.
  const ticks: number[] = [];
  const step = (key.max - key.min) / Math.max(1, key.count);
  for (let i = 0; i <= key.count; i += 1) {
    ticks.push(key.min + step * i);
  }
  cache.set(serialized, ticks);
  return ticks;
}

export function clearTickCache() {
  cache.clear();
}
