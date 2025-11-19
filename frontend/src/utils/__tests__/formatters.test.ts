/**
 * Tests for formatting utilities
 *
 * These affect display but not data integrity.
 * Still important for user comprehension of frequency values.
 */

import { describe, expect, it } from 'vitest';
import {
  formatFrequency,
  formatDuration,
  formatSampleRate,
  formatFileSize,
} from '../formatters';

describe('formatFrequency', () => {
  describe('GHz range (≥1e9)', () => {
    it('formats 1 GHz', () => {
      expect(formatFrequency(1e9)).toBe('1.000 GHz');
      expect(formatFrequency(1e9, true)).toBe('1.00G');
    });

    it('formats fractional GHz', () => {
      expect(formatFrequency(2.4e9)).toBe('2.400 GHz');
      expect(formatFrequency(2.4e9, true)).toBe('2.40G');
    });

    it('formats large GHz values', () => {
      expect(formatFrequency(5.8e9)).toBe('5.800 GHz');
      expect(formatFrequency(24e9, true)).toBe('24.00G');
    });
  });

  describe('MHz range (≥1e6, <1e9)', () => {
    it('formats 1 MHz', () => {
      expect(formatFrequency(1e6)).toBe('1.000 MHz');
      expect(formatFrequency(1e6, true)).toBe('1.0M');
    });

    it('formats typical SDR frequencies', () => {
      expect(formatFrequency(433.92e6)).toBe('433.920 MHz');
      expect(formatFrequency(915e6, true)).toBe('915.0M');
    });

    it('formats edge of GHz boundary', () => {
      expect(formatFrequency(999.999e6)).toBe('999.999 MHz');
    });
  });

  describe('kHz range (≥1e3, <1e6)', () => {
    it('formats 1 kHz', () => {
      expect(formatFrequency(1e3)).toBe('1.000 kHz');
      expect(formatFrequency(1e3, true)).toBe('1.0k');
    });

    it('formats typical audio frequencies', () => {
      expect(formatFrequency(44.1e3)).toBe('44.100 kHz');
    });
  });

  describe('Hz range (<1e3)', () => {
    it('formats Hz values', () => {
      expect(formatFrequency(100)).toBe('100 Hz');
      expect(formatFrequency(100, true)).toBe('100');
    });

    it('formats 0 Hz', () => {
      expect(formatFrequency(0)).toBe('0 Hz');
      expect(formatFrequency(0, true)).toBe('0');
    });

    it('formats fractional Hz', () => {
      // toFixed(0) rounds
      expect(formatFrequency(0.5)).toBe('1 Hz');
      expect(formatFrequency(0.4)).toBe('0 Hz');
    });
  });

  describe('negative frequencies', () => {
    // Negative frequencies occur in IQ baseband representation
    it('handles negative GHz', () => {
      expect(formatFrequency(-1e9)).toBe('-1.000 GHz');
    });

    it('handles negative MHz', () => {
      expect(formatFrequency(-100e6)).toBe('-100.000 MHz');
    });

    it('handles negative kHz', () => {
      expect(formatFrequency(-10e3)).toBe('-10.000 kHz');
    });

    it('handles negative Hz', () => {
      expect(formatFrequency(-100)).toBe('-100 Hz');
    });
  });

  describe('precision edge cases', () => {
    it('handles very small positive values', () => {
      expect(formatFrequency(0.001)).toBe('0 Hz');
    });

    it('handles values just below thresholds', () => {
      // Just below 1 GHz
      expect(formatFrequency(999_999_999)).toBe('1000.000 MHz');
      // Just below 1 MHz
      expect(formatFrequency(999_999)).toBe('999.999 kHz');
    });
  });
});

describe('formatDuration', () => {
  it('formats zero seconds', () => {
    expect(formatDuration(0)).toBe('00:00:00');
  });

  it('formats seconds only', () => {
    expect(formatDuration(5)).toBe('00:00:05');
    expect(formatDuration(59)).toBe('00:00:59');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(60)).toBe('00:01:00');
    expect(formatDuration(90)).toBe('00:01:30');
    expect(formatDuration(3599)).toBe('00:59:59');
  });

  it('formats hours, minutes, seconds', () => {
    expect(formatDuration(3600)).toBe('01:00:00');
    expect(formatDuration(3661)).toBe('01:01:01');
    expect(formatDuration(86399)).toBe('23:59:59');
  });

  it('formats more than 24 hours', () => {
    expect(formatDuration(86400)).toBe('24:00:00');
    expect(formatDuration(90000)).toBe('25:00:00');
  });

  it('truncates fractional seconds', () => {
    // Math.floor behavior
    expect(formatDuration(1.9)).toBe('00:00:01');
    expect(formatDuration(59.999)).toBe('00:00:59');
  });

  it('handles negative duration (unexpected but should not crash)', () => {
    // Math.floor of negative numbers rounds toward negative infinity
    const result = formatDuration(-1);
    // This will produce weird results but shouldn't throw
    expect(typeof result).toBe('string');
  });
});

describe('formatSampleRate', () => {
  it('formats MSPS (≥1e6)', () => {
    expect(formatSampleRate(1e6)).toBe('1.0 MSPS');
    expect(formatSampleRate(2.4e6)).toBe('2.4 MSPS');
    expect(formatSampleRate(20e6)).toBe('20.0 MSPS');
  });

  it('formats kSPS (≥1e3, <1e6)', () => {
    expect(formatSampleRate(1e3)).toBe('1.0 kSPS');
    expect(formatSampleRate(44.1e3)).toBe('44.1 kSPS');
    expect(formatSampleRate(500e3)).toBe('500.0 kSPS');
  });

  it('formats SPS (<1e3)', () => {
    expect(formatSampleRate(100)).toBe('100 SPS');
    expect(formatSampleRate(0)).toBe('0 SPS');
  });
});

describe('formatFileSize', () => {
  it('formats GB (≥1e9)', () => {
    expect(formatFileSize(1e9)).toBe('1.00 GB');
    expect(formatFileSize(1.5e9)).toBe('1.50 GB');
  });

  it('formats MB (≥1e6, <1e9)', () => {
    expect(formatFileSize(1e6)).toBe('1.00 MB');
    expect(formatFileSize(100e6)).toBe('100.00 MB');
  });

  it('formats KB (≥1e3, <1e6)', () => {
    expect(formatFileSize(1e3)).toBe('1.00 KB');
    expect(formatFileSize(512e3)).toBe('512.00 KB');
  });

  it('formats bytes (<1e3)', () => {
    expect(formatFileSize(100)).toBe('100 B');
    expect(formatFileSize(0)).toBe('0 B');
  });
});
