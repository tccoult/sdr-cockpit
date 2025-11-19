/**
 * Tests for formatting utilities
 *
 * Basic sanity check that unit thresholds work.
 */

import { describe, expect, it } from 'vitest';
import {
  formatFrequency,
  formatDuration,
  formatSampleRate,
  formatFileSize,
} from '../formatters';

describe('formatters', () => {
  it('formats values with correct units', () => {
    // Frequency ranges
    expect(formatFrequency(2.4e9)).toBe('2.400 GHz');
    expect(formatFrequency(433.92e6)).toBe('433.920 MHz');
    expect(formatFrequency(44.1e3)).toBe('44.100 kHz');
    expect(formatFrequency(100)).toBe('100 Hz');
    expect(formatFrequency(-100e6)).toBe('-100.000 MHz');

    // Duration
    expect(formatDuration(3661)).toBe('01:01:01');

    // Sample rate
    expect(formatSampleRate(20e6)).toBe('20.0 MSPS');

    // File size
    expect(formatFileSize(1.5e9)).toBe('1.50 GB');
  });
});
