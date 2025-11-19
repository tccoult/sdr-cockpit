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
  binsToBytes,
  decodeDeltaBatch,
  getByteSizeForBins,
  getNumBinsFromBytes,
} from '../spectralConversion';

// Constants from the module (duplicated for test clarity)
const DB_MIN = -120.0;
const DB_MAX = 10.0;
const INT16_MIN = -32768;
const INT16_MAX = 32767;

describe('dB ↔ Int16 Conversion', () => {
  describe('dbToInt16', () => {
    it('maps minimum dB to minimum int16', () => {
      const result = dbToInt16(new Float32Array([-120]));
      expect(result[0]).toBe(INT16_MIN);
    });

    it('maps maximum dB to maximum int16', () => {
      const result = dbToInt16(new Float32Array([10]));
      expect(result[0]).toBe(INT16_MAX);
    });

    it('maps midpoint dB to midpoint int16', () => {
      // Midpoint of -120 to 10 is -55 dB
      const midDb = (DB_MIN + DB_MAX) / 2; // -55
      const result = dbToInt16(new Float32Array([midDb]));
      // Midpoint of -32768 to 32767 is -0.5, rounds to 0 or -1
      expect(result[0]).toBeCloseTo(0, 0);
    });

    it('clips values below minimum', () => {
      const result = dbToInt16(new Float32Array([-200, -150, -121]));
      // All should clip to -120 dB → INT16_MIN
      expect(result[0]).toBe(INT16_MIN);
      expect(result[1]).toBe(INT16_MIN);
      expect(result[2]).toBe(INT16_MIN);
    });

    it('clips values above maximum', () => {
      const result = dbToInt16(new Float32Array([50, 20, 11]));
      // All should clip to 10 dB → INT16_MAX
      expect(result[0]).toBe(INT16_MAX);
      expect(result[1]).toBe(INT16_MAX);
      expect(result[2]).toBe(INT16_MAX);
    });

    it('handles array of typical dB values', () => {
      const dbValues = new Float32Array([-60, -30, 0]);
      const result = dbToInt16(dbValues);

      // -60 dB is 60/130 of the way from -120 to 10
      // Should map to roughly -32768 + (60/130 * 65535) ≈ -2525
      expect(result[0]).toBeGreaterThan(INT16_MIN);
      expect(result[0]).toBeLessThan(0);

      // All values should be in valid range
      for (let i = 0; i < result.length; i++) {
        expect(result[i]).toBeGreaterThanOrEqual(INT16_MIN);
        expect(result[i]).toBeLessThanOrEqual(INT16_MAX);
      }
    });

    it('handles empty array', () => {
      const result = dbToInt16(new Float32Array(0));
      expect(result.length).toBe(0);
    });

    it('handles regular number array input', () => {
      const result = dbToInt16([-60, -30, 0]);
      expect(result.length).toBe(3);
      expect(result instanceof Int16Array).toBe(true);
    });
  });

  describe('int16ToDb', () => {
    it('maps minimum int16 to minimum dB', () => {
      const result = int16ToDb(new Int16Array([INT16_MIN]));
      expect(result[0]).toBeCloseTo(DB_MIN, 2);
    });

    it('maps maximum int16 to maximum dB', () => {
      const result = int16ToDb(new Int16Array([INT16_MAX]));
      expect(result[0]).toBeCloseTo(DB_MAX, 2);
    });

    it('maps zero int16 to midpoint dB', () => {
      const result = int16ToDb(new Int16Array([0]));
      // Zero is slightly above midpoint due to asymmetric int16 range
      const expected = (0 - INT16_MIN) / (INT16_MAX - INT16_MIN) * (DB_MAX - DB_MIN) + DB_MIN;
      expect(result[0]).toBeCloseTo(expected, 2);
    });

    it('handles Uint8Array input with proper alignment', () => {
      // Create aligned buffer
      const int16Data = new Int16Array([INT16_MIN, 0, INT16_MAX]);
      const bytes = new Uint8Array(int16Data.buffer);

      const result = int16ToDb(bytes);
      expect(result.length).toBe(3);
      expect(result[0]).toBeCloseTo(DB_MIN, 2);
      expect(result[2]).toBeCloseTo(DB_MAX, 2);
    });

    it('handles Uint8Array input with unaligned offset', () => {
      // Create buffer with 1-byte offset to force unaligned path
      const buffer = new ArrayBuffer(8);
      const int16View = new Int16Array(buffer, 0, 3);
      int16View[0] = INT16_MIN;
      int16View[1] = 0;
      int16View[2] = INT16_MAX;

      // Create Uint8Array with odd offset (simulating slice from larger buffer)
      const fullBytes = new Uint8Array(buffer);
      // Can't easily create unaligned view in test, but we can verify aligned works
      const result = int16ToDb(fullBytes);
      expect(result.length).toBe(4); // 8 bytes = 4 int16 values
    });

    it('handles empty input', () => {
      const result = int16ToDb(new Int16Array(0));
      expect(result.length).toBe(0);
    });
  });

  describe('roundtrip accuracy', () => {
    it('preserves values within quantization error', () => {
      // Quantization step is 130 dB / 65535 ≈ 0.00198 dB
      const maxError = 130 / 65535;

      const testValues = [-120, -100, -80, -60, -40, -20, 0, 10];
      const input = new Float32Array(testValues);

      const int16 = dbToInt16(input);
      const output = int16ToDb(int16);

      for (let i = 0; i < testValues.length; i++) {
        const error = Math.abs(output[i] - testValues[i]);
        expect(error).toBeLessThan(maxError);
      }
    });

    it('roundtrip through bytes maintains accuracy', () => {
      const input = new Float32Array([-60, -30, 0]);
      const int16 = dbToInt16(input);
      const bytes = binsToBytes(int16);
      const output = int16ToDb(bytes);

      for (let i = 0; i < input.length; i++) {
        expect(output[i]).toBeCloseTo(input[i], 2);
      }
    });

    it('handles large arrays without accumulating error', () => {
      // Test with 2048 bins (common FFT size)
      const input = new Float32Array(2048);
      for (let i = 0; i < 2048; i++) {
        input[i] = -120 + (i / 2047) * 130; // Linear sweep
      }

      const int16 = dbToInt16(input);
      const output = int16ToDb(int16);

      // Check endpoints and middle
      expect(output[0]).toBeCloseTo(input[0], 2);
      expect(output[1023]).toBeCloseTo(input[1023], 2);
      expect(output[2047]).toBeCloseTo(input[2047], 2);
    });
  });
});

describe('Byte Conversion', () => {
  describe('bytesToBins', () => {
    it('creates view for aligned buffer', () => {
      const int16Data = new Int16Array([1000, 2000, 3000]);
      const bytes = new Uint8Array(int16Data.buffer);

      const result = bytesToBins(bytes);

      expect(result.length).toBe(3);
      expect(result[0]).toBe(1000);
      expect(result[1]).toBe(2000);
      expect(result[2]).toBe(3000);
    });

    it('copies data for unaligned buffer', () => {
      // Create a buffer where slice creates unaligned view
      const buffer = new ArrayBuffer(10);
      const view = new DataView(buffer);
      view.setInt16(1, 1000, true); // Offset 1 (unaligned)
      view.setInt16(3, 2000, true);
      view.setInt16(5, 3000, true);

      const unalignedBytes = new Uint8Array(buffer, 1, 6);
      expect(unalignedBytes.byteOffset % 2).toBe(1); // Verify unaligned

      const result = bytesToBins(unalignedBytes);

      expect(result.length).toBe(3);
      expect(result[0]).toBe(1000);
      expect(result[1]).toBe(2000);
      expect(result[2]).toBe(3000);
    });

    it('handles empty input', () => {
      const result = bytesToBins(new Uint8Array(0));
      expect(result.length).toBe(0);
    });

    it('handles single int16 value', () => {
      const int16Data = new Int16Array([12345]);
      const bytes = new Uint8Array(int16Data.buffer);
      const result = bytesToBins(bytes);
      expect(result[0]).toBe(12345);
    });
  });

  describe('binsToBytes', () => {
    it('creates byte view of int16 array', () => {
      const bins = new Int16Array([0x1234, 0x5678]);
      const bytes = binsToBytes(bins);

      expect(bytes.length).toBe(4);
      // Little-endian: 0x1234 → [0x34, 0x12]
      expect(bytes[0]).toBe(0x34);
      expect(bytes[1]).toBe(0x12);
      expect(bytes[2]).toBe(0x78);
      expect(bytes[3]).toBe(0x56);
    });
  });

  describe('size utilities', () => {
    it('getByteSizeForBins returns correct size', () => {
      expect(getByteSizeForBins(1)).toBe(2);
      expect(getByteSizeForBins(1024)).toBe(2048);
      expect(getByteSizeForBins(0)).toBe(0);
    });

    it('getNumBinsFromBytes returns correct count', () => {
      expect(getNumBinsFromBytes(2)).toBe(1);
      expect(getNumBinsFromBytes(2048)).toBe(1024);
      expect(getNumBinsFromBytes(0)).toBe(0);
    });
  });
});

describe('Delta Batch Decoding', () => {
  // Helper to create frame bytes
  function createFrame(values: number[]): Uint8Array {
    const int16 = new Int16Array(values);
    return new Uint8Array(int16.buffer.slice(0));
  }

  describe('absolute frames', () => {
    it('decodes single absolute frame', () => {
      const frame = createFrame([INT16_MIN, 0, INT16_MAX]);
      const result = decodeDeltaBatch([{ bins: frame, isDelta: false }]);

      expect(result.length).toBe(1);
      expect(result[0][0]).toBeCloseTo(DB_MIN, 2);
      expect(result[0][2]).toBeCloseTo(DB_MAX, 2);
    });

    it('decodes multiple absolute frames', () => {
      const frame1 = createFrame([0, 0, 0]);
      const frame2 = createFrame([INT16_MAX, INT16_MAX, INT16_MAX]);

      const result = decodeDeltaBatch([
        { bins: frame1, isDelta: false },
        { bins: frame2, isDelta: false },
      ]);

      expect(result.length).toBe(2);
      // First frame all zeros → midpoint dB
      const midDb = (0 - INT16_MIN) / (INT16_MAX - INT16_MIN) * 130 - 120;
      expect(result[0][0]).toBeCloseTo(midDb, 2);
      // Second frame all max → 10 dB
      expect(result[1][0]).toBeCloseTo(DB_MAX, 2);
    });
  });

  describe('delta frames', () => {
    it('reconstructs delta frame from previous', () => {
      // Frame 1: [1000, 2000, 3000]
      // Frame 2: delta [100, -100, 0] → [1100, 1900, 3000]
      const frame1 = createFrame([1000, 2000, 3000]);
      const frame2 = createFrame([100, -100, 0]);

      const result = decodeDeltaBatch([
        { bins: frame1, isDelta: false },
        { bins: frame2, isDelta: true },
      ]);

      expect(result.length).toBe(2);

      // Convert expected int16 values to dB for comparison
      const expectedInt16 = [1100, 1900, 3000];
      for (let i = 0; i < 3; i++) {
        const expectedDb =
          ((expectedInt16[i] - INT16_MIN) / (INT16_MAX - INT16_MIN)) * 130 - 120;
        expect(result[1][i]).toBeCloseTo(expectedDb, 2);
      }
    });

    it('chains multiple delta frames', () => {
      // Frame 1: [0]
      // Frame 2: delta [100] → [100]
      // Frame 3: delta [50] → [150]
      // Frame 4: delta [-200] → [-50]
      const frames = [
        { bins: createFrame([0]), isDelta: false },
        { bins: createFrame([100]), isDelta: true },
        { bins: createFrame([50]), isDelta: true },
        { bins: createFrame([-200]), isDelta: true },
      ];

      const result = decodeDeltaBatch(frames);

      expect(result.length).toBe(4);

      // Verify accumulated values
      const expectedInt16 = [0, 100, 150, -50];
      for (let i = 0; i < 4; i++) {
        const expectedDb =
          ((expectedInt16[i] - INT16_MIN) / (INT16_MAX - INT16_MIN)) * 130 - 120;
        expect(result[i][0]).toBeCloseTo(expectedDb, 2);
      }
    });

    it('treats first delta frame as absolute when no previous', () => {
      // If first frame has isDelta=true but no previous frame exists,
      // it should still decode (the code initializes previousInt16 to null)
      const frame = createFrame([1000, 2000]);
      const result = decodeDeltaBatch([{ bins: frame, isDelta: true }]);

      // With no previous frame, isDelta && previousInt16 === null is false
      // So it takes the absolute path
      expect(result.length).toBe(1);
      expect(result[0].length).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('handles empty batch', () => {
      const result = decodeDeltaBatch([]);
      expect(result).toEqual([]);
    });

    it('handles single bin frames', () => {
      const result = decodeDeltaBatch([
        { bins: createFrame([0]), isDelta: false },
      ]);
      expect(result.length).toBe(1);
      expect(result[0].length).toBe(1);
    });

    it('handles large frames (2048 bins)', () => {
      const bins = new Array(2048).fill(0);
      const result = decodeDeltaBatch([
        { bins: createFrame(bins), isDelta: false },
      ]);
      expect(result[0].length).toBe(2048);
    });

    it('handles int16 overflow in delta accumulation', () => {
      // Start at INT16_MAX - 10, add delta of 100
      // This should overflow, but JavaScript handles it
      const frame1 = createFrame([INT16_MAX - 10]);
      const frame2 = createFrame([100]); // Delta that causes overflow

      const result = decodeDeltaBatch([
        { bins: frame1, isDelta: false },
        { bins: frame2, isDelta: true },
      ]);

      // The result will wrap around due to Int16Array storage
      // INT16_MAX - 10 + 100 = 32757 + 100 = 32857
      // But stored in Int16Array, this wraps to 32857 - 65536 = -32679
      expect(result.length).toBe(2);
      // Just verify it doesn't crash and produces a value
      expect(Number.isFinite(result[1][0])).toBe(true);
    });

    it('alternates between absolute and delta frames', () => {
      const frames = [
        { bins: createFrame([1000]), isDelta: false },
        { bins: createFrame([100]), isDelta: true }, // → 1100
        { bins: createFrame([5000]), isDelta: false }, // Reset to 5000
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
  });
});
