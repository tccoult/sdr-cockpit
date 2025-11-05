import type { AxisRange } from "../types";

export interface DecimationIndices {
  readonly indices: Uint32Array;
  count: number;
}

export interface DecimationScratch {
  first: Int32Array;
  last: Int32Array;
  min: Int32Array;
  max: Int32Array;
  minValue: Float32Array;
  maxValue: Float32Array;
  out: Uint32Array;
}

export function createDecimationScratch(initialCapacity = 0): DecimationScratch {
  const safeCapacity = Math.max(0, Math.floor(initialCapacity));
  return {
    first: new Int32Array(safeCapacity),
    last: new Int32Array(safeCapacity),
    min: new Int32Array(safeCapacity),
    max: new Int32Array(safeCapacity),
    minValue: new Float32Array(safeCapacity),
    maxValue: new Float32Array(safeCapacity),
    out: new Uint32Array(Math.max(4, safeCapacity * 4)),
  };
}

/**
 * Min/Max bucket decimator that returns indices into the original series so
 * callers can reuse existing Float32Array buffers.
 */
export function minMaxDecimateIndices(
  x: Float32Array,
  y: Float32Array,
  range: AxisRange,
  pixelWidth: number,
  scratch: DecimationScratch
): DecimationIndices {
  const length = Math.min(x.length, y.length);
  if (
    length === 0 ||
    pixelWidth <= 0 ||
    !Number.isFinite(pixelWidth) ||
    range.max <= range.min
  ) {
    return {
      indices: scratch.out,
      count: 0,
    };
  }

  const span = range.max - range.min;
  const bucketCount = Math.min(Math.max(1, Math.floor(pixelWidth)), length);
  ensureScratchCapacity(scratch, bucketCount);

  if (bucketCount <= 1 || length <= bucketCount * 2) {
    let outCount = 0;
    for (let i = 0; i < length; i += 1) {
      const xVal = x[i];
      const yVal = y[i];
      if (!Number.isFinite(xVal) || !Number.isFinite(yVal)) continue;
      if (xVal < range.min || xVal > range.max) continue;
      scratch.out[outCount] = i;
      outCount += 1;
    }
    return {
      indices: scratch.out,
      count: outCount,
    };
  }

  const { first, last, min, max, minValue, maxValue } = scratch;

  for (let i = 0; i < length; i += 1) {
    const xVal = x[i];
    if (!Number.isFinite(xVal) || xVal < range.min || xVal > range.max) {
      continue;
    }
    const bucket = Math.max(
      0,
      Math.min(
        bucketCount - 1,
        Math.floor(((xVal - range.min) / span) * bucketCount)
      )
    );
    if (first[bucket] === -1) {
      first[bucket] = i;
    }
    last[bucket] = i;

    const yVal = y[i];
    if (!Number.isFinite(yVal)) {
      continue;
    }
    if (yVal < minValue[bucket]) {
      minValue[bucket] = yVal;
      min[bucket] = i;
    }
    if (yVal > maxValue[bucket]) {
      maxValue[bucket] = yVal;
      max[bucket] = i;
    }
  }

  let outCount = 0;
  for (let bucket = 0; bucket < bucketCount; bucket += 1) {
    const firstIdx = first[bucket];
    if (firstIdx === -1) {
      continue;
    }
    const lastIdx = last[bucket];
    const minIdx = min[bucket];
    const maxIdx = max[bucket];

    const bag: number[] = [];
    if (firstIdx !== -1 && Number.isFinite(y[firstIdx])) {
      bag.push(firstIdx);
    }
    if (minIdx !== -1 && minIdx !== firstIdx) {
      bag.push(minIdx);
    }
    if (maxIdx !== -1 && maxIdx !== firstIdx && maxIdx !== minIdx) {
      bag.push(maxIdx);
    }
    if (
      lastIdx !== -1 &&
      lastIdx !== firstIdx &&
      lastIdx !== minIdx &&
      lastIdx !== maxIdx &&
      Number.isFinite(y[lastIdx])
    ) {
      bag.push(lastIdx);
    } else if (
      lastIdx === firstIdx &&
      Number.isFinite(y[lastIdx]) &&
      bag.length === 0
    ) {
      bag.push(lastIdx);
    }

    bag.sort((a, b) => a - b);
    for (const idx of bag) {
      if (outCount === 0 || scratch.out[outCount - 1] !== idx) {
        scratch.out[outCount] = idx;
        outCount += 1;
      }
    }
  }

  return {
    indices: scratch.out,
    count: outCount,
  };
}

function ensureScratchCapacity(scratch: DecimationScratch, bucketCount: number) {
  const required = Math.max(1, bucketCount);
  const nextSize = computeNextSize(scratch.first.length, required);
  if (scratch.first.length < required) {
    scratch.first = new Int32Array(nextSize);
    scratch.last = new Int32Array(nextSize);
    scratch.min = new Int32Array(nextSize);
    scratch.max = new Int32Array(nextSize);
    scratch.minValue = new Float32Array(nextSize);
    scratch.maxValue = new Float32Array(nextSize);
  }
  scratch.first.fill(-1, 0, required);
  scratch.last.fill(-1, 0, required);
  scratch.min.fill(-1, 0, required);
  scratch.max.fill(-1, 0, required);
  scratch.minValue.fill(Number.POSITIVE_INFINITY, 0, required);
  scratch.maxValue.fill(Number.NEGATIVE_INFINITY, 0, required);

  const neededOut = Math.max(4, required * 4);
  if (scratch.out.length < neededOut) {
    const outSize = computeNextSize(scratch.out.length, neededOut);
    scratch.out = new Uint32Array(outSize);
  }
}

function computeNextSize(current: number, required: number): number {
  if (current >= required) {
    return current;
  }
  const growth = current === 0 ? required : Math.ceil(current * 1.5);
  return Math.max(required, growth);
}
