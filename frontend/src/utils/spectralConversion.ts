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
  if (int16Values instanceof Uint8Array) {
    // Decode bytes directly to Float32Array, avoiding intermediate Int16Array
    // This skips alignment issues and one extra iteration
    const numSamples = int16Values.byteLength / 2;
    const result = new Float32Array(numSamples);

    // Create DataView to read int16 values without alignment concerns
    const view = new DataView(int16Values.buffer, int16Values.byteOffset, int16Values.byteLength);

    for (let i = 0; i < numSamples; i++) {
      // Read int16 value (little-endian, matches protobuf encoding)
      const int16Value = view.getInt16(i * 2, true);

      // Normalize to 0-1 range
      const normalized = (int16Value - INT16_MIN) / INT16_RANGE;

      // Scale to dB range
      result[i] = normalized * DB_RANGE + DB_MIN;
    }

    return result;
  } else {
    // Int16Array path - just convert values
    const result = new Float32Array(int16Values.length);

    for (let i = 0; i < int16Values.length; i++) {
      // Normalize to 0-1 range
      const normalized = (int16Values[i] - INT16_MIN) / INT16_RANGE;

      // Scale to dB range
      result[i] = normalized * DB_RANGE + DB_MIN;
    }

    return result;
  }
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
  // Check if the buffer is properly aligned (byteOffset must be multiple of 2)
  if (data.byteOffset % 2 === 0) {
    // Can create view directly
    return new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  } else {
    // Buffer is not aligned, need to copy the data
    const alignedBuffer = new Uint8Array(data);
    return new Int16Array(alignedBuffer.buffer);
  }
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

/**
 * Decode a delta-encoded batch of FFT frames.
 *
 * First frame contains absolute int16 values.
 * Subsequent frames contain deltas (differences) from previous frame.
 * This is used to improve compression ratios for spectrograms.
 *
 * @param batchFrames Array of frames where bins are Uint8Array (int16 bytes)
 * @returns Array of dB bin values for each frame
 */
export function decodeDeltaBatch(
  batchFrames: Array<{ bins: Uint8Array }>
): Float32Array[] {
  if (batchFrames.length === 0) return [];

  const result: Float32Array[] = [];
  const view0 = new DataView(
    batchFrames[0].bins.buffer,
    batchFrames[0].bins.byteOffset,
    batchFrames[0].bins.byteLength
  );
  const numBins = batchFrames[0].bins.byteLength / 2;

  // First frame: absolute values
  let previousInt16 = new Int16Array(numBins);
  const firstFrameDb = new Float32Array(numBins);

  for (let i = 0; i < numBins; i++) {
    const int16Value = view0.getInt16(i * 2, true);
    previousInt16[i] = int16Value;

    // Convert to dB
    const normalized = (int16Value - INT16_MIN) / INT16_RANGE;
    firstFrameDb[i] = normalized * DB_RANGE + DB_MIN;
  }
  result.push(firstFrameDb);

  // Subsequent frames: deltas
  for (let frameIdx = 1; frameIdx < batchFrames.length; frameIdx++) {
    const frame = batchFrames[frameIdx];
    const view = new DataView(
      frame.bins.buffer,
      frame.bins.byteOffset,
      frame.bins.byteLength
    );
    const currentDb = new Float32Array(numBins);

    for (let i = 0; i < numBins; i++) {
      // Read delta value
      const delta = view.getInt16(i * 2, true);

      // Reconstruct: previous + delta
      const reconstructed = previousInt16[i] + delta;
      previousInt16[i] = reconstructed;

      // Convert to dB
      const normalized = (reconstructed - INT16_MIN) / INT16_RANGE;
      currentDb[i] = normalized * DB_RANGE + DB_MIN;
    }
    result.push(currentDb);
  }

  return result;
}
