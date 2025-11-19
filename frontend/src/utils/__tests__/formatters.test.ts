/**
 * Tests for formatting utilities
 *
 * These affect display readability. Keep tests minimal since
 * the logic is just toFixed() with unit suffixes.
 */

import { describe, expect, it } from 'vitest';
import {
  formatFrequency,
  formatDuration,
  formatSampleRate,
  formatFileSize,
} from '../formatters';

describe('formatFrequency', () => {
  it('formats each unit range correctly', () => {
    expect(formatFrequency(2.4e9)).toBe('2.400 GHz');
    expect(formatFrequency(433.92e6)).toBe('433.920 MHz');
    expect(formatFrequency(44.1e3)).toBe('44.100 kHz');
    expect(formatFrequency(100)).toBe('100 Hz');
    expect(formatFrequency(0)).toBe('0 Hz');
  });

  it('handles negative frequencies (IQ baseband)', () => {
    expect(formatFrequency(-100e6)).toBe('-100.000 MHz');
    expect(formatFrequency(-10e3)).toBe('-10.000 kHz');
  });

  it('handles compact format', () => {
    expect(formatFrequency(2.4e9, true)).toBe('2.40G');
    expect(formatFrequency(915e6, true)).toBe('915.0M');
    expect(formatFrequency(1e3, true)).toBe('1.0k');
  });
});

describe('formatDuration', () => {
  it('formats HH:MM:SS correctly', () => {
    expect(formatDuration(0)).toBe('00:00:00');
    expect(formatDuration(59)).toBe('00:00:59');
    expect(formatDuration(3661)).toBe('01:01:01');
    expect(formatDuration(86400)).toBe('24:00:00');
  });
});

describe('formatSampleRate', () => {
  it('formats each unit range correctly', () => {
    expect(formatSampleRate(20e6)).toBe('20.0 MSPS');
    expect(formatSampleRate(44.1e3)).toBe('44.1 kSPS');
    expect(formatSampleRate(100)).toBe('100 SPS');
  });
});

describe('formatFileSize', () => {
  it('formats each unit range correctly', () => {
    expect(formatFileSize(1.5e9)).toBe('1.50 GB');
    expect(formatFileSize(100e6)).toBe('100.00 MB');
    expect(formatFileSize(512e3)).toBe('512.00 KB');
    expect(formatFileSize(100)).toBe('100 B');
  });
});
