/**
 * Tests for spectral data conversion utilities
 *
 * These conversions are CRITICAL to the data pipeline:
 * - All FFT data is converted dB ↔ int16 for streaming
 * - Delta encoding reduces bandwidth but requires accurate reconstruction
 * - Byte alignment issues can corrupt entire frames
 */

import { describe, expect, it } from 'vitest';
import {
  dbToInt16,
  int16ToDb,
  bytesToBins,
  decodeDeltaBatch,
} from '../spectralConversion';

const DB_MIN = -120.0;
const DB_MAX = 10.0;
const INT16_MIN = -32768;
const INT16_MAX = 32767;

describe('dB ↔ Int16 Conversion', () => {
  it('roundtrips within quantization error', () => {
    const maxError = 130 / 65535; // ~0.002 dB
    const input = new Float32Array([DB_MIN, -60, 0, DB_MAX]);

    const int16 = dbToInt16(input);
    const output = int16ToDb(int16);

    for (let i = 0; i < input.length; i++) {
      expect(Math.abs(output[i] - input[i])).toBeLessThan(maxError);
    }
  });

  it('clips out-of-range values', () => {
    const result = dbToInt16(new Float32Array([-200, 50]));
    expect(result[0]).toBe(INT16_MIN);
    expect(result[1]).toBe(INT16_MAX);
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
    const buffer = new ArrayBuffer(10);
    const view = new DataView(buffer);
    view.setInt16(1, 1000, true);
    view.setInt16(3, 2000, true);
    view.setInt16(5, 3000, true);

    const unalignedBytes = new Uint8Array(buffer, 1, 6);
    const result = bytesToBins(unalignedBytes);

    expect(result[0]).toBe(1000);
    expect(result[1]).toBe(2000);
    expect(result[2]).toBe(3000);
  });
});

describe('Delta Batch Decoding', () => {
  function createFrame(values: number[]): Uint8Array {
    return new Uint8Array(new Int16Array(values).buffer.slice(0));
  }

  it('reconstructs chained delta frames', () => {
    const frames = [
      { bins: createFrame([0]), isDelta: false },
      { bins: createFrame([100]), isDelta: true },    // → 100
      { bins: createFrame([50]), isDelta: true },     // → 150
      { bins: createFrame([-200]), isDelta: true },   // → -50
    ];

    const result = decodeDeltaBatch(frames);
    const expectedInt16 = [0, 100, 150, -50];

    for (let i = 0; i < 4; i++) {
      const expectedDb =
        ((expectedInt16[i] - INT16_MIN) / (INT16_MAX - INT16_MIN)) * 130 - 120;
      expect(result[i][0]).toBeCloseTo(expectedDb, 2);
    }
  });

  it('handles int16 overflow without crashing', () => {
    const result = decodeDeltaBatch([
      { bins: createFrame([INT16_MAX - 10]), isDelta: false },
      { bins: createFrame([100]), isDelta: true },
    ]);

    expect(Number.isFinite(result[1][0])).toBe(true);
  });
});
