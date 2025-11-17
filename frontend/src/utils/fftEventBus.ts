/**
 * FFT data event bus for communication between data sources and visualizations
 * Used by both online (WebSocket) and offline (mock generator) modes
 */

import { FFTData, FFTDataBatch } from '../types/sdr';

/**
 * Dispatch FFT data as a custom event (batch format)
 */
export function dispatchFFTData(fftData: FFTData | FFTData[]) {
  // Convert single frame to batch format for consistency
  const batch: FFTDataBatch = Array.isArray(fftData)
    ? { frames: fftData }
    : { frames: [fftData] };

  const event = new CustomEvent('fft-data', { detail: batch });
  window.dispatchEvent(event);
}

/**
 * Dispatch a batch of FFT data
 */
export function dispatchFFTBatch(frames: FFTData[]) {
  const batch: FFTDataBatch = { frames };
  const event = new CustomEvent('fft-data', { detail: batch });
  window.dispatchEvent(event);
}
