/**
 * Centralized formatting utilities for the SDR Cockpit frontend
 */

/**
 * Format frequency with appropriate unit and precision
 */
export function formatFrequency(freq: number, short: boolean = false): string {
  if (Math.abs(freq) >= 1e9) {
    return short
      ? `${(freq / 1e9).toFixed(2)}G`
      : `${(freq / 1e9).toFixed(3)} GHz`;
  }
  if (Math.abs(freq) >= 1e6) {
    return short
      ? `${(freq / 1e6).toFixed(1)}M`
      : `${(freq / 1e6).toFixed(3)} MHz`;
  }
  if (Math.abs(freq) >= 1e3) {
    return short
      ? `${(freq / 1e3).toFixed(1)}k`
      : `${(freq / 1e3).toFixed(3)} kHz`;
  }
  return short ? `${freq.toFixed(0)}` : `${freq.toFixed(0)} Hz`;
}

/**
 * Format duration in seconds to HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format sample rate with appropriate unit
 */
export function formatSampleRate(rate: number): string {
  if (rate >= 1e6) return `${(rate / 1e6).toFixed(1)} MSPS`;
  if (rate >= 1e3) return `${(rate / 1e3).toFixed(1)} kSPS`;
  return `${rate.toFixed(0)} SPS`;
}

/**
 * Format file size in bytes to human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(2)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(2)} KB`;
  return `${bytes} B`;
}
