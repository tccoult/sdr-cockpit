/**
 * Tests for formatting utilities
 */

import { describe, expect, it } from 'vitest';
import {
  formatFrequency,
  formatDuration,
  formatSampleRate,
  formatFileSize,
} from '../formatters';

describe('formatFrequency', () => {
  it('should format frequencies in GHz', () => {
    expect(formatFrequency(2.4e9)).toBe('2.400 GHz');
    expect(formatFrequency(1e9)).toBe('1.000 GHz');
  });

  it('should format frequencies in MHz', () => {
    expect(formatFrequency(433.92e6)).toBe('433.920 MHz');
    expect(formatFrequency(1e6)).toBe('1.000 MHz');
  });

  it('should format frequencies in kHz', () => {
    expect(formatFrequency(44.1e3)).toBe('44.100 kHz');
    expect(formatFrequency(1e3)).toBe('1.000 kHz');
  });

  it('should format frequencies in Hz', () => {
    expect(formatFrequency(100)).toBe('100 Hz');
    expect(formatFrequency(0)).toBe('0 Hz');
    expect(formatFrequency(999)).toBe('999 Hz');
  });

  it('should handle negative frequencies', () => {
    expect(formatFrequency(-100e6)).toBe('-100.000 MHz');
    expect(formatFrequency(-2.5e3)).toBe('-2.500 kHz');
  });

  it('should use short format when requested', () => {
    expect(formatFrequency(2.456e9, true)).toBe('2.46G');
    expect(formatFrequency(433.92e6, true)).toBe('433.9M');
    expect(formatFrequency(44.1e3, true)).toBe('44.1k');
    expect(formatFrequency(100, true)).toBe('100');
  });
});

describe('formatDuration', () => {
  it('should format durations correctly', () => {
    expect(formatDuration(0)).toBe('00:00:00');
    expect(formatDuration(59)).toBe('00:00:59');
    expect(formatDuration(60)).toBe('00:01:00');
    expect(formatDuration(61)).toBe('00:01:01');
    expect(formatDuration(3599)).toBe('00:59:59');
    expect(formatDuration(3600)).toBe('01:00:00');
    expect(formatDuration(3661)).toBe('01:01:01');
    expect(formatDuration(86400)).toBe('24:00:00');
  });
});

describe('formatSampleRate', () => {
  it('should format sample rates in MSPS', () => {
    expect(formatSampleRate(20e6)).toBe('20.0 MSPS');
    expect(formatSampleRate(1e6)).toBe('1.0 MSPS');
  });

  it('should format sample rates in kSPS', () => {
    expect(formatSampleRate(250e3)).toBe('250.0 kSPS');
    expect(formatSampleRate(1e3)).toBe('1.0 kSPS');
  });

  it('should format sample rates in SPS', () => {
    expect(formatSampleRate(500)).toBe('500 SPS');
    expect(formatSampleRate(0)).toBe('0 SPS');
    expect(formatSampleRate(999)).toBe('999 SPS');
  });
});

describe('formatFileSize', () => {
  it('should format file sizes in GB', () => {
    expect(formatFileSize(1.5e9)).toBe('1.50 GB');
    expect(formatFileSize(1e9)).toBe('1.00 GB');
  });

  it('should format file sizes in MB', () => {
    expect(formatFileSize(1.5e6)).toBe('1.50 MB');
    expect(formatFileSize(1e6)).toBe('1.00 MB');
  });

  it('should format file sizes in KB', () => {
    expect(formatFileSize(1.5e3)).toBe('1.50 KB');
    expect(formatFileSize(1e3)).toBe('1.00 KB');
  });

  it('should format file sizes in B', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(999)).toBe('999 B');
  });
});
