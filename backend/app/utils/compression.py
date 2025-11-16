"""
Zstandard compression utilities for spectral data streaming.

Uses zstd for compressing batches of FFT frames in spectrogram mode.
Provides significant bandwidth reduction for repeated spectral data.
"""

import zstandard as zstd
from typing import Optional

# Zstd compression level (1-22, default 3)
# Higher = better compression but slower
# Level 3 is a good balance for real-time streaming
DEFAULT_COMPRESSION_LEVEL = 3

# Minimum batch size to compress (frames)
# Below this threshold, compression overhead isn't worth it
MIN_BATCH_SIZE_FOR_COMPRESSION = 10

# Compressor instance (reusable for better performance)
_compressor: Optional[zstd.ZstdCompressor] = None


def get_compressor() -> zstd.ZstdCompressor:
    """
    Get or create a zstd compressor instance.

    Reusing the compressor improves performance by avoiding
    repeated initialization.
    """
    global _compressor
    if _compressor is None:
        _compressor = zstd.ZstdCompressor(level=DEFAULT_COMPRESSION_LEVEL)
    return _compressor


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
    Determine if a batch should be compressed based on size.

    Compression has overhead, so small batches aren't worth compressing.

    Args:
        batch_size: Number of frames in the batch

    Returns:
        bool: True if batch should be compressed
    """
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
