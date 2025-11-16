"""Protobuf message definitions for SDR spectral data."""

from .spectral_data_pb2 import FFTFrame, FFTFrameBatch, SpectralMessage  # type: ignore

__all__ = ["FFTFrame", "FFTFrameBatch", "SpectralMessage"]
