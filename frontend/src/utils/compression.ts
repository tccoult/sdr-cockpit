/**
 * Zstandard decompression utilities for spectral data streaming.
 *
 * Uses fzstd (WASM-based) for fast decompression of batch data.
 */

import { decompress } from "fzstd";

/**
 * Decompress zstandard compressed data.
 *
 * @param compressedData - Compressed bytes from backend
 * @returns Decompressed bytes
 *
 * @example
 * ```ts
 * const compressed = new Uint8Array([...]); // From websocket
 * const decompressed = await decompressData(compressed);
 * ```
 */
export async function decompressData(
  compressedData: Uint8Array
): Promise<Uint8Array> {
  try {
    // fzstd returns a Uint8Array
    const decompressed = await decompress(compressedData);
    return decompressed;
  } catch (error) {
    console.error("Failed to decompress data:", error);
    throw new Error(`Decompression failed: ${error}`);
  }
}

/**
 * Get decompression statistics.
 *
 * @param compressedSize - Size of compressed data in bytes
 * @param decompressedSize - Size of decompressed data in bytes
 * @returns Statistics object
 */
export function getDecompressionStats(
  compressedSize: number,
  decompressedSize: number
): {
  compressedSize: number;
  decompressedSize: number;
  ratio: number;
  percentageSaved: number;
} {
  const ratio = decompressedSize / compressedSize;
  const percentageSaved = ((1 - compressedSize / decompressedSize) * 100);

  return {
    compressedSize,
    decompressedSize,
    ratio,
    percentageSaved,
  };
}
