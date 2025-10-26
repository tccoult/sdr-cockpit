"""Tests for SDR simulator"""
import pytest
import numpy as np
from main import generate_data, get_mode, generate_test_data, generate_random_data


def test_generate_test_data():
    """Test deterministic test data generation"""
    data = generate_test_data(1024)
    assert len(data) == 1024
    assert isinstance(data, np.ndarray)

    # Test data should be deterministic
    data2 = generate_test_data(1024)
    np.testing.assert_array_equal(data, data2)


def test_generate_random_data():
    """Test random data generation"""
    data = generate_random_data(1024)
    assert len(data) == 1024
    assert isinstance(data, np.ndarray)

    # Random data should be different each time
    data2 = generate_random_data(1024)
    assert not np.array_equal(data, data2)


def test_generate_data_test_mode():
    """Test data generation in test mode"""
    data = generate_data("test", 512)
    assert len(data) == 512
    assert isinstance(data, np.ndarray)


def test_generate_data_random_mode():
    """Test data generation in random mode"""
    data = generate_data("random", 512)
    assert len(data) == 512
    assert isinstance(data, np.ndarray)


def test_generate_data_realistic_mode():
    """Test data generation in realistic mode"""
    data = generate_data("realistic", 512)
    assert len(data) == 512
    assert isinstance(data, np.ndarray)


def test_generate_data_invalid_mode():
    """Test that invalid mode raises error"""
    with pytest.raises(ValueError):
        generate_data("invalid_mode", 512)


def test_get_mode_default():
    """Test get_mode returns default when env var not set"""
    import os
    # Ensure SDR_MODE is not set
    os.environ.pop("SDR_MODE", None)
    mode = get_mode()
    assert mode == "test"
