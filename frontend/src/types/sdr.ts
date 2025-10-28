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

/**
 * Task types
 */
export type TaskType = 'rx' | 'tx';

/**
 * Task status
 */
export type TaskStatus = 'live' | 'paused' | 'transmitting' | 'stopped';

/**
 * Task owner type
 */
export type TaskOwner = 'self' | 'external';

/**
 * Recording information
 */
export interface RecordingInfo {
  filename: string;
  duration: number;      // Recording duration in seconds
  fileSize: number;      // File size in bytes
  isRecording: boolean;
}

/**
 * TX playback information
 */
export interface PlaybackInfo {
  filename: string;
  progress: number;      // 0-1
  isLooping: boolean;
  duration: number;      // Total duration in seconds
}

/**
 * SDR Task
 */
export interface Task {
  id: string;
  name: string;
  type: TaskType;
  frequency: number;        // Center frequency in Hz
  sampleRate: number;       // Sample rate in Hz
  bandwidth?: number;       // Bandwidth in Hz
  fftSize?: number;         // FFT size (bins)
  owner: TaskOwner;
  ownerName: string;        // "You" or external source name
  status: TaskStatus;
  uptime: number;           // Uptime in seconds
  recording?: RecordingInfo;
  playback?: PlaybackInfo;
  createdAt: number;        // Unix timestamp in ms
  fps?: number;             // Current frame rate
}

/**
 * Task creation parameters
 */
export interface CreateRxTaskParams {
  name: string;
  frequency: number;
  sampleRate: number;
  bandwidth: number;
  fftSize: number;
}

/**
 * Task creation parameters for TX
 */
export interface CreateTxTaskParams {
  name: string;
  file: File;
  frequency?: number;       // Override frequency (optional)
  loop: boolean;
}
