/**
 * Tests for spectral data conversion utilities
 *
 * These conversions are CRITICAL to the data pipeline:
 * - All FFT data is converted dB ↔ int16 for streaming
 * - Delta encoding reduces bandwidth but requires accurate reconstruction
 * - Byte alignment issues can corrupt entire frames
 *
 * If these break, you get silent data corruption in spectrograms.
 */

import { describe, expect, it } from 'vitest';
import {
  dbToInt16,
  int16ToDb,
  bytesToBins,
  decodeDeltaBatch,
} from '../spectralConversion';

// Constants from the module
const DB_MIN = -120.0;
const DB_MAX = 10.0;
const INT16_MIN = -32768;
const INT16_MAX = 32767;

describe('dB ↔ Int16 Conversion', () => {
  it('maps boundary values correctly', () => {
    const result = dbToInt16(new Float32Array([DB_MIN, DB_MAX]));
    expect(result[0]).toBe(INT16_MIN);
    expect(result[1]).toBe(INT16_MAX);
  });

  it('clips out-of-range values', () => {
    const result = dbToInt16(new Float32Array([-200, 50]));
    expect(result[0]).toBe(INT16_MIN);
    expect(result[1]).toBe(INT16_MAX);
  });

  it('roundtrips within quantization error', () => {
    // Quantization step is 130 dB / 65535 ≈ 0.002 dB
    const maxError = 130 / 65535;
    const testValues = [-120, -60, 0, 10];
    const input = new Float32Array(testValues);

    const int16 = dbToInt16(input);
    const output = int16ToDb(int16);

    for (let i = 0; i < testValues.length; i++) {
      const error = Math.abs(output[i] - testValues[i]);
      expect(error).toBeLessThan(maxError);
    }
  });

  it('handles large arrays (2048 bins) without error accumulation', () => {
    const input = new Float32Array(2048);
    for (let i = 0; i < 2048; i++) {
      input[i] = -120 + (i / 2047) * 130;
    }

    const int16 = dbToInt16(input);
    const output = int16ToDb(int16);

    expect(output[0]).toBeCloseTo(input[0], 2);
    expect(output[2047]).toBeCloseTo(input[2047], 2);
  });
});

describe('Byte Alignment', () => {
  it('handles aligned buffer', () => {
    const int16Data = new Int16Array([1000, 2000, 3000]);
    const bytes = new Uint8Array(int16Data.buffer);
    const result = bytesToBins(bytes);

    expect(result[0]).toBe(1000);
    expect(result[1]).toBe(2000);
    expect(result[2]).toBe(3000);
  });

  it('handles unaligned buffer without corruption', () => {
    // Create buffer with offset to force unaligned path
    const buffer = new ArrayBuffer(10);
    const view = new DataView(buffer);
    view.setInt16(1, 1000, true);
    view.setInt16(3, 2000, true);
    view.setInt16(5, 3000, true);

    const unalignedBytes = new Uint8Array(buffer, 1, 6);
    expect(unalignedBytes.byteOffset % 2).toBe(1); // Verify unaligned

    const result = bytesToBins(unalignedBytes);

    expect(result[0]).toBe(1000);
    expect(result[1]).toBe(2000);
    expect(result[2]).toBe(3000);
  });
});

describe('Delta Batch Decoding', () => {
  function createFrame(values: number[]): Uint8Array {
    const int16 = new Int16Array(values);
    return new Uint8Array(int16.buffer.slice(0));
  }

  it('reconstructs chained delta frames', () => {
    // Frame 1: [0] absolute
    // Frame 2: [100] delta → [100]
    // Frame 3: [50] delta → [150]
    // Frame 4: [-200] delta → [-50]
    const frames = [
      { bins: createFrame([0]), isDelta: false },
      { bins: createFrame([100]), isDelta: true },
      { bins: createFrame([50]), isDelta: true },
      { bins: createFrame([-200]), isDelta: true },
    ];

    const result = decodeDeltaBatch(frames);
    const expectedInt16 = [0, 100, 150, -50];

    for (let i = 0; i < 4; i++) {
      const expectedDb =
        ((expectedInt16[i] - INT16_MIN) / (INT16_MAX - INT16_MIN)) * 130 - 120;
      expect(result[i][0]).toBeCloseTo(expectedDb, 2);
    }
  });

  it('handles absolute frame reset mid-batch', () => {
    const frames = [
      { bins: createFrame([1000]), isDelta: false },
      { bins: createFrame([100]), isDelta: true }, // → 1100
      { bins: createFrame([5000]), isDelta: false }, // Reset
      { bins: createFrame([-100]), isDelta: true }, // → 4900
    ];

    const result = decodeDeltaBatch(frames);
    const expectedInt16 = [1000, 1100, 5000, 4900];

    for (let i = 0; i < 4; i++) {
      const expectedDb =
        ((expectedInt16[i] - INT16_MIN) / (INT16_MAX - INT16_MIN)) * 130 - 120;
      expect(result[i][0]).toBeCloseTo(expectedDb, 2);
    }
  });

  it('handles int16 overflow in delta accumulation', () => {
    // Near INT16_MAX + large delta = overflow wrap
    const frame1 = createFrame([INT16_MAX - 10]);
    const frame2 = createFrame([100]);

    const result = decodeDeltaBatch([
      { bins: frame1, isDelta: false },
      { bins: frame2, isDelta: true },
    ]);

    // Should wrap, not crash
    expect(Number.isFinite(result[1][0])).toBe(true);
  });
});
