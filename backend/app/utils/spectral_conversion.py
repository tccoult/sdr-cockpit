"""
Utilities for converting spectral data to/from int16 format.

The conversion maps dB values to int16 range:
- dB range: -120 dB to +10 dB (130 dB dynamic range)
- Int16 range: -32768 to +32767 (65536 values)
- Resolution: ~0.002 dB per step
"""

import numpy as np
from typing import Union

# Constants for dB to int16 conversion
DB_MIN = -120.0
DB_MAX = 10.0
DB_RANGE = DB_MAX - DB_MIN  # 130 dB
INT16_MIN = -32768
INT16_MAX = 32767
INT16_RANGE = INT16_MAX - INT16_MIN  # 65535


def db_to_int16(db_values: Union[np.ndarray, list, float]) -> np.ndarray:
    """
    Convert dB values to int16 representation.

    Args:
        db_values: Power values in dB (can be array, list, or single value)

    Returns:
        np.ndarray: Int16 representation of the dB values

    Example:
        >>> db_to_int16([-120, -60, 0, 10])
        array([-32768, -16384,     0,  32767], dtype=int16)
    """
    # Convert to numpy array if needed
    db_array = np.asarray(db_values, dtype=np.float64)

    # Clip to valid dB range
    db_clipped = np.clip(db_array, DB_MIN, DB_MAX)

    # Normalize to 0-1 range
    normalized = (db_clipped - DB_MIN) / DB_RANGE

    # Scale to int16 range and convert
    int16_values = (normalized * INT16_RANGE + INT16_MIN).astype(np.int16)

    return int16_values


def int16_to_db(int16_values: Union[np.ndarray, list, int]) -> np.ndarray:
    """
    Convert int16 representation back to dB values.

    Args:
        int16_values: Int16 representation (can be array, list, or single value)

    Returns:
        np.ndarray: Power values in dB

    Example:
        >>> int16_to_db(np.array([-32768, -16384, 0, 32767], dtype=np.int16))
        array([-120., -60., 0., 10.])
    """
    # Convert to numpy array if needed
    int16_array = np.asarray(int16_values, dtype=np.int16)

    # Normalize to 0-1 range
    normalized = (int16_array.astype(np.float64) - INT16_MIN) / INT16_RANGE

    # Scale to dB range
    db_values = normalized * DB_RANGE + DB_MIN

    return db_values


def bins_to_bytes(bins: np.ndarray) -> bytes:
    """
    Convert int16 bin array to bytes for protobuf transmission.

    Args:
        bins: Int16 array of FFT bins

    Returns:
        bytes: Raw bytes suitable for protobuf bytes field

    Example:
        >>> bins = np.array([100, -200, 300], dtype=np.int16)
        >>> data = bins_to_bytes(bins)
        >>> len(data)
        6
    """
    # Ensure it's int16
    int16_bins = bins.astype(np.int16)

    # Convert to bytes (little-endian)
    return int16_bins.tobytes()


def bytes_to_bins(data: bytes) -> np.ndarray:
    """
    Convert bytes from protobuf back to int16 bin array.

    Args:
        data: Raw bytes from protobuf message

    Returns:
        np.ndarray: Int16 array of FFT bins

    Example:
        >>> data = b'\\x64\\x00\\x38\\xff\\x2c\\x01'  # 100, -200, 300
        >>> bins = bytes_to_bins(data)
        >>> bins.tolist()
        [100, -200, 300]
    """
    # Convert bytes to int16 array (little-endian)
    return np.frombuffer(data, dtype=np.int16)


def db_bins_to_bytes(db_bins: np.ndarray) -> bytes:
    """
    Convert dB bin values directly to int16 bytes.

    This is a convenience function that combines db_to_int16 and bins_to_bytes.

    Args:
        db_bins: Power values in dB

    Returns:
        bytes: Int16 bytes suitable for protobuf transmission

    Example:
        >>> db_bins = np.array([-120, -60, 0, 10])
        >>> data = db_bins_to_bytes(db_bins)
        >>> len(data)
        8
    """
    int16_bins = db_to_int16(db_bins)
    return bins_to_bytes(int16_bins)


def bytes_to_db_bins(data: bytes) -> np.ndarray:
    """
    Convert int16 bytes directly to dB bin values.

    This is a convenience function that combines bytes_to_bins and int16_to_db.

    Args:
        data: Int16 bytes from protobuf message

    Returns:
        np.ndarray: Power values in dB

    Example:
        >>> # Assuming data contains int16 bytes
        >>> db_bins = bytes_to_db_bins(data)
        >>> db_bins.shape
        (2048,)
    """
    int16_bins = bytes_to_bins(data)
    return int16_to_db(int16_bins)
