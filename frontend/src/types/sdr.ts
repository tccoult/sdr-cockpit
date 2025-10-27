/**
 * Type definitions for SDR data and visualization
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

/**
 * Visualization state (shared between FFT and waterfall)
 */
export interface VisualizationState {
  frequencyRange: FrequencyRange;
  displaySettings: DisplaySettings;
}
