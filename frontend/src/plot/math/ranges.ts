import type { AxisRange } from "../types";

/**
 * Minimum span to prevent zero-width ranges that would cause division errors.
 * This is used across all range normalization to ensure a valid span.
 */
export const MIN_SPAN = 1e-12;

/**
 * Normalizes an axis range to ensure it's valid for rendering.
 *
 * Handles:
 * - NaN/Infinity values (returns default range)
 * - Inverted ranges where min > max (swaps them)
 * - Zero-span ranges where min === max (adds symmetric padding)
 *
 * @param range - The input range to normalize
 * @param defaultRange - Fallback range for invalid input (default: 0-1)
 * @returns A valid, normalized range
 */
export function normalizeRange(
  range: AxisRange | null | undefined,
  defaultRange: AxisRange = { min: 0, max: 1 }
): AxisRange {
  if (!range) {
    return { ...defaultRange };
  }

  let { min, max } = range;

  // Handle invalid values
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { ...defaultRange };
  }

  // Swap if inverted
  if (min > max) {
    [min, max] = [max, min];
  }

  // Ensure minimum span with symmetric padding around center
  if (max - min < MIN_SPAN) {
    const center = (min + max) / 2;
    // Use 1% of magnitude for non-zero centers, MIN_SPAN for zero
    const pad =
      center === 0 ? MIN_SPAN : Math.max(MIN_SPAN, Math.abs(center) * 0.01);
    min = center - pad;
    max = center + pad;
  }

  return { min, max };
}

/**
 * Checks if two ranges are approximately equal within a tolerance.
 *
 * @param a - First range
 * @param b - Second range
 * @param epsilon - Tolerance for comparison (default: 1e-9)
 */
export function rangesEqual(
  a: AxisRange,
  b: AxisRange,
  epsilon = 1e-9
): boolean {
  return Math.abs(a.min - b.min) < epsilon && Math.abs(a.max - b.max) < epsilon;
}

/**
 * Converts an AxisRange to a tuple format [min, max].
 */
export function rangeToTuple(range: AxisRange): [number, number] {
  return [range.min, range.max];
}

/**
 * Converts a tuple [min, max] to an AxisRange.
 */
export function tupleToRange(tuple: [number, number]): AxisRange {
  return { min: tuple[0], max: tuple[1] };
}

/**
 * Normalizes a range, returning null if the input is invalid.
 *
 * Unlike `normalizeRange`, this variant returns null instead of a default
 * when the input is null/undefined or contains non-finite values.
 * Useful when you want to skip processing invalid ranges rather than
 * fall back to a default.
 *
 * @param range - The input range to normalize
 * @returns Normalized range, or null if input was invalid
 */
export function normalizeRangeOrNull(
  range: AxisRange | null | undefined
): AxisRange | null {
  if (!range) {
    return null;
  }

  let { min, max } = range;

  // Return null for invalid values
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return null;
  }

  // Swap if inverted
  if (min > max) {
    [min, max] = [max, min];
  }

  // Ensure minimum span with symmetric padding around center
  if (max - min < MIN_SPAN) {
    const center = (min + max) / 2;
    const pad =
      center === 0 ? MIN_SPAN : Math.max(MIN_SPAN, Math.abs(center) * 0.01);
    min = center - pad;
    max = center + pad;
  }

  return { min, max };
}
