/**
 * Utilities for computing dB (decibel) ranges for visualization displays.
 * Used to synchronize Y-axis scaling across FFT, waterfall, and spectrogram views.
 */

export interface DbRange {
  minDb: number;
  maxDb: number;
}

/**
 * Default dB range used when no valid data is available.
 * Typical SDR signals fall within -120 to 0 dB range.
 */
export const DEFAULT_DB_RANGE: DbRange = { minDb: -100, maxDb: -20 };

/**
 * Computes a padded dB range from measured min/max values.
 *
 * Handles edge cases:
 * - Null metrics: returns default range
 * - NaN/Infinity values: returns default range
 * - Equal min/max: applies minimum padding to create valid range
 * - Inverted range (max < min): applies symmetric padding around center
 *
 * @param metrics - Measured min/max dB values, or null if no data
 * @param paddingFactor - Fraction of range to add as padding (default: 0.1 = 10%)
 * @returns A valid dB range with padding applied
 */
export function computeDbRangeWithPadding(
  metrics: DbRange | null,
  paddingFactor = 0.1
): DbRange {
  if (!metrics) {
    return { ...DEFAULT_DB_RANGE };
  }

  const { minDb, maxDb } = metrics;

  // Handle invalid values
  if (!Number.isFinite(minDb) || !Number.isFinite(maxDb)) {
    return { ...DEFAULT_DB_RANGE };
  }

  // Handle equal or inverted range - apply symmetric padding around center
  if (maxDb <= minDb) {
    const center = (minDb + maxDb) / 2;
    // Use at least 5 dB padding, or 10% of magnitude
    const pad = Math.max(5, Math.abs(center) * paddingFactor);
    return {
      minDb: Math.floor(center - pad),
      maxDb: Math.ceil(center + pad),
    };
  }

  // Normal case: apply percentage-based padding
  const range = maxDb - minDb;
  const padding = range * paddingFactor;

  return {
    minDb: Math.floor(minDb - padding),
    maxDb: Math.ceil(maxDb + padding),
  };
}

/**
 * Validates a dB range, returning a safe range if invalid.
 *
 * @param range - The range to validate
 * @returns The original range if valid, or DEFAULT_DB_RANGE if invalid
 */
export function validateDbRange(range: DbRange): DbRange {
  const { minDb, maxDb } = range;

  if (
    !Number.isFinite(minDb) ||
    !Number.isFinite(maxDb) ||
    maxDb <= minDb
  ) {
    return { ...DEFAULT_DB_RANGE };
  }

  return range;
}
