/**
 * Type definitions for SDR data and visualization
 *
 * NOTE: Task-related types are now auto-generated from OpenAPI spec.
 * Import from: import { Task, TaskType, TaskStatus, ... } from '../api/client'
 */

/**
 * FFT data frame
 */
export interface FFTData {
  timestamp: number;        // Unix timestamp in ms
  centerFreq: number;       // Center frequency in Hz
  sampleRate: number;       // Sample rate in Hz
  bins: Float32Array;       // FFT power values in dB
}

/**
 * Batched FFT data (for spectrograms or grouped frames)
 */
export interface FFTDataBatch {
  frames: FFTData[];        // Array of FFT frames
  timestamp?: number;       // Batch timestamp in ms (optional)
  centerFreq?: number;      // Center frequency in Hz (optional, can be derived from frames)
  sampleRate?: number;      // Sample rate in Hz (optional, can be derived from frames)
}

/**
 * Frequency range for zoom/pan
 */
export interface FrequencyRange {
  startFreq: number;        // Start frequency in Hz
  endFreq: number;          // End frequency in Hz
}

/**
 * Display settings
 */
export interface DisplaySettings {
  colorMapId: string;       // Selected color map ID
  minDb: number;            // Minimum dB value for color mapping
  maxDb: number;            // Maximum dB value for color mapping
  fftHeight: number;        // Height of FFT display in pixels
  waterfallHeight: number;  // Height of waterfall display in pixels
}
