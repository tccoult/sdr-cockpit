"""Mock FFT data generator for development and testing
Generates realistic-looking RF spectrum with noise and signals
"""

import math
import time
import numpy as np
from typing import List, Literal
from dataclasses import dataclass


@dataclass
class Signal:
    """Signal parameters for mock RF generation"""

    offset: float  # Relative offset from center (-0.5 to 0.5)
    strength: float  # Signal strength in dB
    width: float  # Bandwidth (relative to sample rate)
    drift: float  # Frequency drift rate
    modulation: Literal["am", "fm", "cw", "noise"]
    fade_period: float  # Time in seconds for one fade cycle
    intermittency: float  # 0.0 (always on) to 1.0 (very intermittent)
    cw_on: bool = True  # Current state for CW keying
    cw_timer: float = 0.5  # Time until next CW state change


class MockFFTGenerator:
    """Generate mock FFT data for testing"""

    def __init__(
        self,
        center_freq: float,
        sample_rate: float,
        fft_size: int = 2048,
        seed: int = 0,
    ):
        self.center_freq = center_freq
        self.sample_rate = sample_rate
        self.fft_size = fft_size
        self.time = 0.0
        self.signals: List[Signal] = []

        # Generate unique signals based on seed
        effective_seed = seed or int(center_freq % 10000)

        def random(n: int) -> float:
            """Simple seeded random function"""
            x = math.sin(effective_seed * n + 12.9898) * 43758.5453123
            return x - math.floor(x)

        # Initialize mock signals with variation based on seed
        num_signals = 2 + int(random(1) * 3)  # 2-4 signals

        for i in range(num_signals):
            r1 = random(i * 4 + 1)
            r2 = random(i * 4 + 2)
            r3 = random(i * 4 + 3)
            r4 = random(i * 4 + 4)
            r5 = random(i * 4 + 5)
            r6 = random(i * 4 + 6)

            modulations: list[Literal["am", "fm", "cw", "noise"]] = [
                "am",
                "fm",
                "cw",
                "noise",
            ]
            modulation = modulations[int(r1 * 4)]

            self.signals.append(
                Signal(
                    offset=(r1 - 0.5) * 0.8,  # -0.4 to 0.4
                    strength=-30 - r2 * 40,  # -30 to -70 dB
                    width=0.005 + r3 * 0.03,  # Varying widths
                    drift=(r4 - 0.5) * 0.0002,
                    modulation=modulation,
                    fade_period=10 + r5 * 20,  # 10-30 second fade cycle
                    intermittency=0.0 if modulation == "cw" else r6 * 0.05,
                    cw_on=True,
                    cw_timer=0.5 + r5 * 0.5,
                )
            )

    def generate_fft(self) -> dict:
        """Generate a single FFT frame"""
        # Base noise floor (-90 to -100 dB) - vectorized
        bins = -95 + np.random.uniform(0, 10, self.fft_size)

        # Add signals
        for signal in self.signals:
            self._add_signal(bins, signal)

        # Update time for drift and modulation
        self.time += 0.016  # ~60 FPS

        return {
            "timestamp": int(time.time() * 1000),
            "centerFreq": self.center_freq,
            "sampleRate": self.sample_rate,
            "bins": bins.tolist(),  # Convert to list for JSON serialization
        }

    def _add_signal(self, bins: np.ndarray, signal: Signal) -> None:
        """Add a signal to the FFT bins (vectorized)"""
        # Intermittency check (skip CW as it has its own logic)
        if signal.modulation != "cw" and np.random.random() < signal.intermittency:
            return

        # CW keying logic
        delta_t = 0.016  # ~60 FPS
        if signal.modulation == "cw":
            signal.cw_timer -= delta_t
            if signal.cw_timer <= 0:
                signal.cw_on = not signal.cw_on
                if signal.cw_on:
                    # "dit" or "dah" length
                    signal.cw_timer = 0.1 + np.random.random() * 0.3
                else:
                    # "space" length
                    signal.cw_timer = 0.1 + np.random.random() * 0.4

            # If in "off" state, don't draw
            if not signal.cw_on:
                return

        # Calculate bin position with drift
        drift_offset = math.sin(self.time * signal.drift * 10) * 0.02
        relative_offset = signal.offset + drift_offset
        center_bin = int((relative_offset + 0.5) * self.fft_size)

        # Calculate signal width in bins
        width_bins = max(5, int(signal.width * self.fft_size))

        # Signal fading (not for CW)
        fade_db = 0.0
        if signal.modulation != "cw":
            fade_db = 5 * math.sin((self.time * 2 * math.pi) / signal.fade_period)

        # Modulation effects
        am_sideband_scaler = 1.0
        modulation_db = 0.0

        if signal.modulation == "am":
            am_sideband_scaler = 0.75 + 0.25 * math.sin(self.time * 5)
        elif signal.modulation == "noise":
            noise_power_scaler = 0.8 + np.random.random() * 0.4
            modulation_db = 10 * math.log10(noise_power_scaler)

        # Signal shape generation - VECTORIZED
        loop_width = max(10, width_bins * 6)
        min_bin = max(0, int(center_bin - loop_width))
        max_bin = min(self.fft_size, int(center_bin + loop_width))

        # Create distance array for all bins in range
        bin_indices = np.arange(min_bin, max_bin)
        distances = bin_indices - center_bin

        # Compute signal shape based on modulation type (vectorized)
        if signal.modulation == "am":
            carrier_width = max(2, width_bins * 0.05)
            carrier = np.exp(-0.5 * (distances / carrier_width) ** 2)
            sideband_spacing = width_bins * 0.5
            sideband_width = width_bins * 0.2
            sidebands = np.exp(
                -0.5 * ((np.abs(distances) - sideband_spacing) / sideband_width) ** 2
            )
            linear_shape = carrier * 0.6 + sidebands * 0.4 * am_sideband_scaler
        elif signal.modulation == "fm":
            normalized = np.abs(distances) / width_bins
            linear_shape = np.exp(-0.5 * normalized**1.5)
        elif signal.modulation == "cw":
            cw_width = max(2, width_bins * 0.05)
            linear_shape = np.exp(-0.5 * (distances / cw_width) ** 2)
        else:  # noise
            linear_shape = np.exp(-0.5 * (distances / width_bins) ** 2)

        # Convert to dB
        shape_db = 10 * np.log10(linear_shape + 1e-10)

        # Combine components in dB domain
        signal_power = signal.strength + fade_db + modulation_db + shape_db

        # Add to existing bins (power domain addition) - VECTORIZED
        bins[min_bin:max_bin] = 10 * np.log10(
            10 ** (bins[min_bin:max_bin] / 10) + 10 ** (signal_power / 10)
        )

    def set_center_freq(self, freq: float) -> None:
        """Update center frequency"""
        self.center_freq = freq

    def set_sample_rate(self, rate: float) -> None:
        """Update sample rate"""
        self.sample_rate = rate
