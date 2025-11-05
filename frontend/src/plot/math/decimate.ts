import type { AxisRange } from "../types";

export interface DecimatedPoint {
  x: number;
  y: number;
  index: number;
}

export interface DecimationResult {
  readonly x: Float32Array;
  readonly y: Float32Array;
}

/**
 * Min/Max bucket decimator. Produces at most ~4 samples per pixel column while
 * preserving the order of points within each bucket so the rendered line
 * remains continuous.
 */
export function minMaxDecimate(
  x: Float32Array,
  y: Float32Array,
  range: AxisRange,
  pixelWidth: number
): DecimationResult {
  const length = Math.min(x.length, y.length);
  if (length === 0 || pixelWidth <= 0 || !Number.isFinite(pixelWidth)) {
    return {
      x: new Float32Array(0),
      y: new Float32Array(0),
    };
  }

  const span = range.max - range.min || 1;
  const bucketCount = Math.min(
    Math.max(1, Math.floor(pixelWidth)),
    length
  );

  if (bucketCount <= 1 || length <= bucketCount * 2) {
    const filteredX: number[] = [];
    const filteredY: number[] = [];
    for (let i = 0; i < length; i += 1) {
      const xVal = x[i];
      const yVal = y[i];
      if (!Number.isFinite(xVal) || xVal < range.min || xVal > range.max) {
        continue;
      }
      if (!Number.isFinite(yVal)) continue;
      filteredX.push(xVal);
      filteredY.push(yVal);
    }
    return {
      x: Float32Array.from(filteredX),
      y: Float32Array.from(filteredY),
    };
  }

  const firstIndex = new Int32Array(bucketCount).fill(-1);
  const lastIndex = new Int32Array(bucketCount).fill(-1);
  const minIndex = new Int32Array(bucketCount).fill(-1);
  const maxIndex = new Int32Array(bucketCount).fill(-1);
  const minValue = new Float32Array(bucketCount).fill(Number.POSITIVE_INFINITY);
  const maxValue = new Float32Array(bucketCount).fill(Number.NEGATIVE_INFINITY);

  for (let i = 0; i < length; i += 1) {
    const xVal = x[i];
    if (!Number.isFinite(xVal)) continue;
    if (xVal < range.min || xVal > range.max) continue;
    const bucket = Math.max(
      0,
      Math.min(
        bucketCount - 1,
        Math.floor(((xVal - range.min) / span) * bucketCount)
      )
    );
    if (firstIndex[bucket] === -1) {
      firstIndex[bucket] = i;
    }
    lastIndex[bucket] = i;

    const yVal = y[i];
    if (!Number.isFinite(yVal)) continue;
    if (yVal < minValue[bucket]) {
      minValue[bucket] = yVal;
      minIndex[bucket] = i;
    }
    if (yVal > maxValue[bucket]) {
      maxValue[bucket] = yVal;
      maxIndex[bucket] = i;
    }
  }

  const outX: number[] = [];
  const outY: number[] = [];

  const appendIndex = (idx: number) => {
    if (idx < 0 || idx >= length) return;
    const lastPos = outX.length - 1;
    if (lastPos >= 0 && outX[lastPos] === x[idx] && outY[lastPos] === y[idx]) {
      return;
    }
    outX.push(x[idx]);
    outY.push(y[idx]);
  };

  for (let bucket = 0; bucket < bucketCount; bucket += 1) {
    if (firstIndex[bucket] === -1) continue;
    const indices: number[] = [];
    const first = firstIndex[bucket];
    const last = lastIndex[bucket];
    const minIdx = minIndex[bucket];
    const maxIdx = maxIndex[bucket];

    indices.push(first);
    if (minIdx !== -1 && minIdx !== first) indices.push(minIdx);
    if (maxIdx !== -1 && maxIdx !== first && maxIdx !== minIdx) {
      indices.push(maxIdx);
    }
    if (last !== -1 && last !== first && last !== minIdx && last !== maxIdx) {
      indices.push(last);
    }

    indices.sort((a, b) => a - b);
    for (const idx of indices) {
      appendIndex(idx);
    }
  }

  return {
    x: Float32Array.from(outX),
    y: Float32Array.from(outY),
  };
}
