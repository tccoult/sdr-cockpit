/**
 * Utilities for converting spectral data to/from int16 format.
 *
 * The conversion maps dB values to int16 range:
 * - dB range: -120 dB to +10 dB (130 dB dynamic range)
 * - Int16 range: -32768 to +32767 (65536 values)
 * - Resolution: ~0.002 dB per step
 */

// Constants for dB to int16 conversion
const DB_MIN = -120.0;
const DB_MAX = 10.0;
const DB_RANGE = DB_MAX - DB_MIN; // 130 dB
const INT16_MIN = -32768;
const INT16_MAX = 32767;
const INT16_RANGE = INT16_MAX - INT16_MIN; // 65535

/**
 * Convert dB values to int16 representation.
 */
export function dbToInt16(dbValues: Float32Array | number[]): Int16Array {
  const result = new Int16Array(dbValues.length);

  for (let i = 0; i < dbValues.length; i++) {
    // Clip to valid dB range
    const dbClipped = Math.max(DB_MIN, Math.min(DB_MAX, dbValues[i]));

    // Normalize to 0-1 range
    const normalized = (dbClipped - DB_MIN) / DB_RANGE;

    // Scale to int16 range and convert
    result[i] = Math.round(normalized * INT16_RANGE + INT16_MIN);
  }

  return result;
}

/**
 * Convert int16 representation back to dB values.
 */
export function int16ToDb(int16Values: Int16Array | Uint8Array): Float32Array {
  // If we receive Uint8Array (raw bytes), convert to Int16Array first
  const int16Array =
    int16Values instanceof Uint8Array
      ? new Int16Array(
          int16Values.buffer,
          int16Values.byteOffset,
          int16Values.byteLength / 2
        )
      : int16Values;

  const result = new Float32Array(int16Array.length);

  for (let i = 0; i < int16Array.length; i++) {
    // Normalize to 0-1 range
    const normalized = (int16Array[i] - INT16_MIN) / INT16_RANGE;

    // Scale to dB range
    result[i] = normalized * DB_RANGE + DB_MIN;
  }

  return result;
}

/**
 * Convert int16 bin array to bytes for protobuf transmission.
 */
export function binsToBytes(bins: Int16Array): Uint8Array {
  return new Uint8Array(bins.buffer, bins.byteOffset, bins.byteLength);
}

/**
 * Convert bytes from protobuf back to int16 bin array.
 */
export function bytesToBins(data: Uint8Array): Int16Array {
  // Create a new Int16Array view of the data
  return new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
}

/**
 * Convert dB bin values directly to bytes.
 *
 * This is a convenience function that combines dbToInt16 and binsToBytes.
 */
export function dbBinsToBytes(dbBins: Float32Array | number[]): Uint8Array {
  const int16Bins = dbToInt16(dbBins);
  return binsToBytes(int16Bins);
}

/**
 * Convert bytes directly to dB bin values.
 *
 * This is a convenience function that combines bytesToBins and int16ToDb.
 */
export function bytesToDbBins(data: Uint8Array): Float32Array {
  return int16ToDb(data);
}

/**
 * Get the expected byte size for a given number of bins.
 */
export function getByteSizeForBins(numBins: number): number {
  return numBins * 2; // 2 bytes per int16 value
}

/**
 * Get the number of bins from byte array size.
 */
export function getNumBinsFromBytes(byteSize: number): number {
  return byteSize / 2; // 2 bytes per int16 value
}
