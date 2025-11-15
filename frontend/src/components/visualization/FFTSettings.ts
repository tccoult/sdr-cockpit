export const FFT_SETTINGS_CONFIG = {
  persistenceEnabled: true,
  persistenceTargetFps: 10,
  persistenceDecay: 0.8, // per-second decay multiplier for persistence envelopes
  persistenceOpacity: 0.3,
  persistenceLineWidth: 1.0,
  maxHoldTargetFps: 5,
  maxHoldOpacity: 0.7,
  maxHoldLineWidth: 1,
  liveTraceLineWidth: 2,
};

export const FFT_SMOOTHING_FACTOR = 0.95;
