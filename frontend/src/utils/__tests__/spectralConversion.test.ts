/**
 * Unit tests for spectral conversion utilities.
 */

import { describe, it, expect } from "vitest";
import {
  dbToInt16,
  int16ToDb,
  bytesToBins,
  binsToBytes,
  dbBinsToBytes,
  bytesToDbBins,
  decodeDeltaBatch,
} from "../spectralConversion";

// Constants for dB to int16 conversion
const INT16_MIN = -32768;
const INT16_MAX = 32767;

describe("Spectral Conversion Utilities", () => {
  describe("dbToInt16 and int16ToDb", () => {
    it("should correctly convert dB values to int16 and back", () => {
      const dbValues = [-120, -55, 0, 10];
      const expectedInt16 = [-32768, 0, 27726, 32767];
      const int16Result = dbToInt16(dbValues);

      expect(int16Result).toHaveLength(dbValues.length);
      int16Result.forEach((val, i) => {
        expect(val).toBe(expectedInt16[i]);
      });

      const dbResult = int16ToDb(int16Result);
      expect(dbResult).toHaveLength(dbValues.length);
      dbResult.forEach((val, i) => {
        expect(val).toBeCloseTo(dbValues[i], 1);
      });
    });

    it("should handle clipping for out-of-range dB values", () => {
      const dbValues = [-150, 50];
      const int16Result = dbToInt16(dbValues);

      expect(int16Result[0]).toBe(INT16_MIN);
      expect(int16Result[1]).toBe(INT16_MAX);
    });

    it("should handle empty arrays", () => {
      const dbValues: number[] = [];
      const int16Result = dbToInt16(dbValues);
      expect(int16Result).toHaveLength(0);

      const int16Values = new Int16Array([]);
      const dbResult = int16ToDb(int16Values);
      expect(dbResult).toHaveLength(0);
    });
  });

  describe("bytesToBins and binsToBytes", () => {
    it("should correctly convert between Int16Array and Uint8Array", () => {
      const int16Values = new Int16Array([-32768, 0, 32767]);
      const bytes = binsToBytes(int16Values);

      // 2 bytes per int16
      expect(bytes).toHaveLength(int16Values.length * 2);

      const reconstructedBins = bytesToBins(bytes);
      expect(reconstructedBins).toEqual(int16Values);
    });

    it("should handle unaligned byte arrays by copying", () => {
      // Create a buffer and an unaligned view on it
      const originalBuffer = new Uint8Array([0, 1, 2, 3, 4, 5]).buffer;
      const unalignedView = new Uint8Array(originalBuffer, 1, 4); // [1, 2, 3, 4]

      // bytesToBins should copy this to a new, aligned buffer
      const bins = bytesToBins(unalignedView);
      expect(bins).toHaveLength(2);

      // Check values (little-endian)
      // 1st int16: val from bytes [1, 2] = 2 * 256 + 1 = 513
      // 2nd int16: val from bytes [3, 4] = 4 * 256 + 3 = 1027
      const view = new DataView(originalBuffer);
      expect(bins[0]).toBe(view.getInt16(1, true)); // 513
      expect(bins[1]).toBe(view.getInt16(3, true)); // 1027
    });
  });

  describe("dbBinsToBytes and bytesToDbBins", () => {
    it("should correctly convert dB values to bytes and back", () => {
      const dbValues = new Float32Array([-120, 0, 10]);
      const bytes = dbBinsToBytes(dbValues);
      const reconstructedDb = bytesToDbBins(bytes);

      reconstructedDb.forEach((val, i) => {
        expect(val).toBeCloseTo(dbValues[i], 0);
      });
    });
  });

  describe("decodeDeltaBatch", () => {
    it("should decode a batch with absolute and delta frames", () => {
      // Frame 1 (absolute)
      const frame1Db = [-60, -50, -40];
      const frame1Bytes = dbBinsToBytes(frame1Db);

      // Frame 2 (delta)
      const frame2Int16 = dbToInt16([-58, -52, -43]);
      const frame1Int16 = dbToInt16(frame1Db);
      const delta = new Int16Array(frame1Int16.map((val, i) => frame2Int16[i] - val));
      const frame2Bytes = binsToBytes(delta);

      // Frame 3 (absolute)
      const frame3Db = [-70, -60, -50];
      const frame3Bytes = dbBinsToBytes(frame3Db);

      const batch = [
        { bins: frame1Bytes, isDelta: false },
        { bins: frame2Bytes, isDelta: true },
        { bins: frame3Bytes, isDelta: false },
      ];

      const decoded = decodeDeltaBatch(batch);
      expect(decoded).toHaveLength(3);

      decoded[0].forEach((val, i) => expect(val).toBeCloseTo(frame1Db[i], 0));
      decoded[1].forEach((val, i) => expect(val).toBeCloseTo(int16ToDb(frame2Int16)[i], 0));
      decoded[2].forEach((val, i) => expect(val).toBeCloseTo(frame3Db[i], 0));
    });

    it("should treat first frame as absolute even if is_delta is true", () => {
      const frameDb = [-60, -50, -40];
      const frameBytes = dbBinsToBytes(frameDb);
      const batch = [{ bins: frameBytes, isDelta: true }];
      const decoded = decodeDeltaBatch(batch);

      expect(decoded).toHaveLength(1);
      decoded[0].forEach((val, i) => expect(val).toBeCloseTo(frameDb[i], 0));
    });

    it("should handle empty batch", () => {
      const decoded = decodeDeltaBatch([]);
      expect(decoded).toHaveLength(0);
    });
  });
});
