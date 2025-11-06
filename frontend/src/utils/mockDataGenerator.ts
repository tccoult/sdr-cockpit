/**
 * Mock FFT data generator for development and testing
 * Generates realistic-looking RF spectrum with noise and signals
 */

import { FFTData } from "../types/sdr";

export class MockFFTGenerator {
  private centerFreq: number;
  private sampleRate: number;
  private fftSize: number;
  private time: number = 0;
  private signals: Signal[] = [];

  constructor(
    centerFreq: number,
    sampleRate: number,
    fftSize: number = 2048,
    seed: number = 0
  ) {
    this.centerFreq = centerFreq;
    this.sampleRate = sampleRate;
    this.fftSize = fftSize;

    // Generate unique signals based on seed (use frequency as seed if not provided)
    // Use a better hash of the frequency to ensure different frequencies produce different seeds
    const effectiveSeed = seed || Math.floor((centerFreq / 1e6) * 1000);
    const random = (n: number) => {
      // Simple seeded random function
      const x = Math.sin(effectiveSeed * n + 12.9898) * 43758.5453123;
      return x - Math.floor(x);
    };

    // Initialize some mock signals with variation based on seed
    const numSignals = 2 + Math.floor(random(1) * 3); // 2-4 signals
    this.signals = [];

    // Replace the 'for' loop inside your constructor with this one
    for (let i = 0; i < numSignals; i++) {
      const r1 = random(i * 4 + 1);
      const r2 = random(i * 4 + 2);
      const r3 = random(i * 4 + 3);
      const r4 = random(i * 4 + 4);
      const r5 = random(i * 4 + 5);
      const r6 = random(i * 4 + 6);

      const modulation = ["am", "fm", "cw", "noise"][Math.floor(r1 * 4)] as
        | "am"
        | "fm"
        | "cw"
        | "noise";

      this.signals.push({
        offset: (r1 - 0.5) * 0.8, // -0.4 to 0.4
        strength: -30 - r2 * 40, // -30 to -70 dB
        width: 0.005 + r3 * 0.03, // Varying widths
        drift: (r4 - 0.5) * 0.0002,
        modulation: modulation,

        fadePeriod: 10 + r5 * 20, // 10-30 second fade cycle
        // CW keying is handled separately, so don't make it intermittent here
        intermittency: modulation === "cw" ? 0.0 : r6 * 0.05, // 0-5% chance of being off
        cwOn: true,
        cwTimer: 0.5 + r5 * 0.5, // Initial time for first "dit" or "dah"
      });
    }
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
    // --- Intermittency Check ---
    // Check if the signal should be "off" this frame
    // (We skip CW because it has its own on/off logic)
    if (signal.modulation !== "cw" && Math.random() < signal.intermittency) {
      return; // Skip drawing this signal
    }

    // --- CW Keying Logic ---
    const deltaT = 0.016; // Assume ~60 FPS, matches time increment in generateFFT
    if (signal.modulation === "cw") {
      signal.cwTimer -= deltaT;
      if (signal.cwTimer <= 0) {
        signal.cwOn = !signal.cwOn; // Flip state
        if (signal.cwOn) {
          // "dit" or "dah" length
          signal.cwTimer = 0.1 + Math.random() * 0.3; // 100-400ms on time
        } else {
          // "space" length
          signal.cwTimer = 0.1 + Math.random() * 0.4; // 100-500ms off time
        }
      }

      // If in an "off" (space) state, don't draw
      if (!signal.cwOn) {
        return;
      }
    }

    // Calculate bin position with drift
    const driftOffset = Math.sin(this.time * signal.drift * 10) * 0.02;
    const relativeOffset = signal.offset + driftOffset;
    const centerBin = Math.floor((relativeOffset + 0.5) * this.fftSize);

    // Calculate signal width in bins
    const widthBins = Math.max(5, Math.floor(signal.width * this.fftSize)); // Ensure min width

    // --- Signal Fading ---
    // Add a slow fade, e.g., +/- 5dB over the fadePeriod
    // We don't apply this to CW to make its keying more prominent
    let fade_dB = 0.0;
    if (signal.modulation !== "cw") {
      fade_dB = 5 * Math.sin((this.time * 2 * Math.PI) / signal.fadePeriod);
    }

    // --- Modulation Effects ---
    let amSidebandScaler = 1.0;
    let noisePowerScaler = 1.0;
    let modulation_dB = 0.0;

    switch (signal.modulation) {
      case "am":
        amSidebandScaler = 0.75 + 0.25 * Math.sin(this.time * 5);
        break;
      case "fm":
      case "cw":
        break;
      case "noise":
        noisePowerScaler = 0.8 + Math.random() * 0.4;
        modulation_dB = 10 * Math.log10(noisePowerScaler);
        break;
    }

    // --- Signal Shape Generation ---
    const loopWidth = Math.max(10, widthBins * 6);
    const minBin = Math.max(0, Math.floor(centerBin - loopWidth));
    const maxBin = Math.min(this.fftSize, Math.floor(centerBin + loopWidth));

    for (let i = minBin; i < maxBin; i++) {
      const distance = i - centerBin;
      let linearShape = 0.0;

      switch (signal.modulation) {
        case "am": {
          const carrierWidth = Math.max(2, widthBins * 0.05);
          const carrier = Math.exp(-0.5 * Math.pow(distance / carrierWidth, 2));
          const sidebandSpacing = widthBins * 0.5;
          const sidebandWidth = widthBins * 0.2;
          const sidebands = Math.exp(
            -0.5 *
              Math.pow(
                (Math.abs(distance) - sidebandSpacing) / sidebandWidth,
                2
              )
          );
          linearShape = carrier * 0.6 + sidebands * 0.4 * amSidebandScaler;
          break;
        }
        case "fm": {
          const normalized = Math.abs(distance) / widthBins;
          linearShape = Math.exp(-0.5 * Math.pow(normalized, 1.5));
          break;
        }
        case "cw": {
          const cwWidth = Math.max(2, widthBins * 0.05);
          linearShape = Math.exp(-0.5 * Math.pow(distance / cwWidth, 2));
          break;
        }
        case "noise":
        default: {
          linearShape = Math.exp(-0.5 * Math.pow(distance / widthBins, 2));
          break;
        }
      }

      const shape_dB = 10 * Math.log10(linearShape + 1e-10);

      // Add all components in the log (dB) domain
      // (base strength) + (fade) + (modulation power) + (shape)
      const signalPower = signal.strength + fade_dB + modulation_dB + shape_dB;

      // Add to existing bin
      bins[i] =
        10 *
        Math.log10(Math.pow(10, bins[i] / 10) + Math.pow(10, signalPower / 10));
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
  offset: number; // Relative offset from center (-0.5 to 0.5)
  strength: number; // Signal strength in dB
  width: number; // Bandwidth (relative to sample rate)
  drift: number; // Frequency drift rate
  modulation: "am" | "fm" | "cw" | "noise";

  // --- ADD THESE NEW PROPERTIES ---
  fadePeriod: number; // Time in seconds for one fade cycle
  intermittency: number; // 0.0 (always on) to 1.0 (very intermittent)
  cwOn: boolean; // Current state for CW keying
  cwTimer: number; // Time until next CW state change
}

/**
 * Dispatch FFT data as a custom event
 */
export function dispatchFFTData(fftData: FFTData) {
  const event = new CustomEvent("fft-data", { detail: fftData });
  window.dispatchEvent(event);
}
