"""
SDR Simulator - Generates mock SDR data

Supports different modes via SDR_MODE environment variable:
- test: Deterministic test patterns for integration tests
- random: Random noise for stress testing
- realistic: Simulated signals (sweeps, carriers, etc.)
"""

import logging
import os
import time

import numpy as np

# Configure logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)


def get_mode() -> str:
    """Get simulator mode from environment variable"""
    return os.environ.get("SDR_MODE", "test")


def generate_test_data(size: int = 1024) -> np.ndarray:
    """Generate deterministic test pattern"""
    return np.sin(2 * np.pi * np.arange(size) / size)


def generate_random_data(size: int = 1024) -> np.ndarray:
    """Generate random noise"""
    return np.random.randn(size)


def generate_realistic_data(size: int = 1024) -> np.ndarray:
    """Generate realistic simulated signal"""
    # Simple carrier wave + noise
    t = np.arange(size) / size
    carrier = np.sin(2 * np.pi * 10 * t)
    noise = 0.1 * np.random.randn(size)
    return carrier + noise


def generate_data(mode: str, size: int = 1024) -> np.ndarray:
    """Generate data based on mode"""
    if mode == "test":
        return generate_test_data(size)
    elif mode == "random":
        return generate_random_data(size)
    elif mode == "realistic":
        return generate_realistic_data(size)
    else:
        raise ValueError(f"Unknown mode: {mode}")


def main():
    """Main simulator loop"""
    mode = get_mode()
    logger.info(f"SDR Simulator starting in '{mode}' mode...")

    try:
        while True:
            data = generate_data(mode)
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("\nSimulator stopped")


if __name__ == "__main__":
    main()
