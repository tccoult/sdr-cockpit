/**
 * Mock FFT data generator for development and testing
 * Generates realistic-looking RF spectrum with noise and signals
 */

import { FFTData } from '../types/sdr';

export class MockFFTGenerator {
  private centerFreq: number;
  private sampleRate: number;
  private fftSize: number;
  private time: number = 0;
  private signals: Signal[] = [];

  constructor(centerFreq: number, sampleRate: number, fftSize: number = 2048) {
    this.centerFreq = centerFreq;
    this.sampleRate = sampleRate;
    this.fftSize = fftSize;

    // Initialize some mock signals
    this.signals = [
      {
        offset: 0.2,          // 20% offset from center
        strength: -35,        // Signal strength in dB
        width: 0.01,         // Signal bandwidth (relative to sample rate)
        drift: 0.0001,       // Slow frequency drift
        modulation: 'am',    // AM modulation
      },
      {
        offset: -0.3,
        strength: -50,
        width: 0.02,
        drift: 0.00005,
        modulation: 'fm',
      },
      {
        offset: 0.0,
        strength: -40,
        width: 0.005,
        drift: -0.0001,
        modulation: 'cw',    // Continuous wave
      },
      {
        offset: 0.45,
        strength: -60,
        width: 0.015,
        drift: 0.00008,
        modulation: 'noise',
      },
    ];
  }

  /**
   * Generate a single FFT frame
   */
  generateFFT(): FFTData {
    const bins = new Float32Array(this.fftSize);

    // Base noise floor (-90 to -100 dB)
    for (let i = 0; i < this.fftSize; i++) {
      bins[i] = -95 + Math.random() * 10;
    }

    // Add signals
    for (const signal of this.signals) {
      this.addSignal(bins, signal);
    }

    // Update time for drift and modulation
    this.time += 0.016; // ~60 FPS

    return {
      timestamp: Date.now(),
      centerFreq: this.centerFreq,
      sampleRate: this.sampleRate,
      bins,
    };
  }

  /**
   * Add a signal to the FFT bins
   */
  private addSignal(bins: Float32Array, signal: Signal) {
    // Calculate bin position with drift
    const driftOffset = Math.sin(this.time * signal.drift * 10) * 0.02;
    const relativeOffset = signal.offset + driftOffset;
    const centerBin = Math.floor((relativeOffset + 0.5) * this.fftSize);

    // Calculate signal width in bins
    const widthBins = Math.floor(signal.width * this.fftSize);

    // Modulation effects
    let modulationEffect = 1.0;
    switch (signal.modulation) {
      case 'am':
        modulationEffect = 0.5 + 0.5 * Math.sin(this.time * 5);
        break;
      case 'fm':
        modulationEffect = 1.0;
        break;
      case 'cw':
        modulationEffect = 1.0;
        break;
      case 'noise':
        modulationEffect = 0.8 + Math.random() * 0.4;
        break;
    }

    // Add Gaussian-shaped signal
    for (let i = 0; i < this.fftSize; i++) {
      const distance = Math.abs(i - centerBin);
      if (distance < widthBins * 3) {
        const gaussian = Math.exp(-0.5 * Math.pow(distance / widthBins, 2));
        const signalPower = signal.strength * modulationEffect * gaussian;

        // Add to existing bin (power domain, so use log addition)
        bins[i] = 10 * Math.log10(
          Math.pow(10, bins[i] / 10) + Math.pow(10, signalPower / 10)
        );
      }
    }
  }

  /**
   * Update center frequency
   */
  setCenterFreq(freq: number) {
    this.centerFreq = freq;
  }

  /**
   * Update sample rate
   */
  setSampleRate(rate: number) {
    this.sampleRate = rate;
  }
}

interface Signal {
  offset: number;        // Relative offset from center (-0.5 to 0.5)
  strength: number;      // Signal strength in dB
  width: number;         // Bandwidth (relative to sample rate)
  drift: number;         // Frequency drift rate
  modulation: 'am' | 'fm' | 'cw' | 'noise';
}

/**
 * Dispatch FFT data as a custom event
 */
export function dispatchFFTData(fftData: FFTData) {
  const event = new CustomEvent('fft-data', { detail: fftData });
  window.dispatchEvent(event);
}
