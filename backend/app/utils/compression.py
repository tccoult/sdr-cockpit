"""
Zstandard compression utilities for spectral data streaming.

Uses zstd for compressing batches of FFT frames in spectrogram mode.
Provides significant bandwidth reduction for repeated spectral data.

Compression level can be configured via ZSTD_COMPRESSION_LEVEL env var:
- 0: Disable compression (send uncompressed batches)
- 1-3: Fast compression, lower ratio (good for very high throughput)
- 5: Default - balanced compression and speed
- 9: Better compression, slower (good for bandwidth-constrained links)
- 22: Maximum compression, very slow (not recommended for real-time)
"""

import time
from typing import Optional, Tuple

import zstandard as zstd

from app.config.settings import get_settings

# Minimum batch size to compress (frames)
# Below this threshold, compression overhead isn't worth it
MIN_BATCH_SIZE_FOR_COMPRESSION = 10

# Compressor instance (reusable for better performance)
_compressor: Optional[zstd.ZstdCompressor] = None
_compressor_level: Optional[int] = None


def get_compressor() -> zstd.ZstdCompressor:
    """
    Get or create a zstd compressor instance.

    Reusing the compressor improves performance by avoiding
    repeated initialization.
    """
    global _compressor, _compressor_level

    target_level = get_settings().compression_level
    if _compressor is None or _compressor_level != target_level:
        _compressor = zstd.ZstdCompressor(level=target_level)
        _compressor_level = target_level

    return _compressor


def get_compression_level() -> int:
    """Get the current compression level."""
    return get_settings().compression_level


def compress_data(data: bytes) -> bytes:
    """
    Compress data using zstandard.

    Args:
        data: Raw bytes to compress

    Returns:
        bytes: Compressed data

    Example:
        >>> original = b"..." * 1000  # Some repetitive data
        >>> compressed = compress_data(original)
        >>> len(compressed) < len(original)
        True
    """
    compressor = get_compressor()
    compressed = compressor.compress(data)
    return bytes(compressed)  # Ensure return type is bytes


def compress_data_timed(data: bytes) -> Tuple[bytes, float]:
    """
    Compress data using zstandard and return timing.

    Args:
        data: Raw bytes to compress

    Returns:
        tuple: (compressed_data, compression_time_ms)
    """
    compressor = get_compressor()
    start = time.perf_counter()
    compressed = compressor.compress(data)
    elapsed_ms = (time.perf_counter() - start) * 1000
    return bytes(compressed), elapsed_ms


def decompress_data(compressed_data: bytes) -> bytes:
    """
    Decompress zstandard compressed data.

    Args:
        compressed_data: Compressed bytes

    Returns:
        bytes: Decompressed data

    Example:
        >>> original = b"test data" * 100
        >>> compressed = compress_data(original)
        >>> decompressed = decompress_data(compressed)
        >>> decompressed == original
        True
    """
    decompressor = zstd.ZstdDecompressor()
    decompressed = decompressor.decompress(compressed_data)
    return bytes(decompressed)  # Ensure return type is bytes


def should_compress_batch(batch_size: int) -> bool:
    """
    Determine if a batch should be compressed based on size and compression level.

    Compression can be disabled by setting ZSTD_COMPRESSION_LEVEL=0.
    Compression has overhead, so small batches aren't worth compressing.

    Args:
        batch_size: Number of frames in the batch

    Returns:
        bool: True if batch should be compressed
    """
    # Level 0 = disable compression
    if get_settings().compression_level == 0:
        return False

    return batch_size >= MIN_BATCH_SIZE_FOR_COMPRESSION


def get_compression_stats(original_size: int, compressed_size: int) -> dict:
    """
    Calculate compression statistics.

    Args:
        original_size: Size of uncompressed data in bytes
        compressed_size: Size of compressed data in bytes

    Returns:
        dict: Statistics including ratio and percentage saved

    Example:
        >>> stats = get_compression_stats(1000, 200)
        >>> stats['ratio']
        5.0
        >>> stats['percentage_saved']
        80.0
    """
    ratio = original_size / compressed_size if compressed_size > 0 else 0
    percentage_saved = (1 - compressed_size / original_size) * 100 if original_size > 0 else 0

    return {
        "original_size": original_size,
        "compressed_size": compressed_size,
        "ratio": ratio,
        "percentage_saved": percentage_saved,
    }
