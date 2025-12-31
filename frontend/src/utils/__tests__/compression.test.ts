/**
 * Tests for compression utilities
 */

import { describe, expect, it } from 'vitest';
import { getDecompressionStats } from '../compression';

describe('getDecompressionStats', () => {
  it('should calculate correct decompression statistics', () => {
    const stats = getDecompressionStats(100, 1000);
    expect(stats.compressedSize).toBe(100);
    expect(stats.decompressedSize).toBe(1000);
    expect(stats.ratio).toBe(10);
    expect(stats.percentageSaved).toBe(90);
  });

  it('should handle zero compressed size to avoid division by zero', () => {
    const stats = getDecompressionStats(0, 1000);
    expect(stats.ratio).toBe(Infinity);
  });

  it('should handle zero decompressed size', () => {
    const stats = getDecompressionStats(100, 0);
    expect(stats.ratio).toBe(0);
    expect(stats.percentageSaved).toBe(-Infinity);
  });

  it('should handle equal compressed and decompressed sizes', () => {
    const stats = getDecompressionStats(100, 100);
    expect(stats.ratio).toBe(1);
    expect(stats.percentageSaved).toBe(0);
  });
});
