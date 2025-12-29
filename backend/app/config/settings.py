"""Application settings loaded from environment."""

import logging
import os
from dataclasses import dataclass, field
from functools import lru_cache
from typing import List


_DEFAULT_ORIGINS = ["http://localhost:3000", "http://localhost:5173"]


def _parse_origins(value: str | None) -> List[str]:
    if not value:
        return _DEFAULT_ORIGINS
    return [origin.strip() for origin in value.split(",") if origin.strip()]


def _parse_bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def _parse_log_level(value: str | None, default: str = "INFO") -> str:
    level = default.upper()
    if not value:
        return level

    candidate = value.strip().upper()
    valid_levels = logging.getLevelNamesMapping()
    if candidate in valid_levels and isinstance(valid_levels[candidate], int):
        return candidate

    return level


def _parse_compression_level(value: str | None, default: int = 3) -> int:
    if value is None:
        return default

    try:
        level = int(value)
    except ValueError:
        return default

    return max(0, min(22, level))


def _parse_int(value: str | None, default: int) -> int:
    if value is None:
        return default

    try:
        return int(value)
    except ValueError:
        return default


@dataclass
class Settings:
    """Runtime configuration for the backend service."""

    cors_allow_origins: List[str] = field(default_factory=lambda: _DEFAULT_ORIGINS)
    seed_mock_tasks: bool = True
    log_level: str = "INFO"
    compression_level: int = 3

    # BIT database configuration
    bit_db_path: str = "/tmp/sdr-cockpit/bit"
    bit_rotation_hours: int = 24
    bit_max_file_size_mb: int = 100
    bit_max_files: int = 7
    bit_rollup_bucket_ms: int = 10_000
    bit_top_failing_tests: int = 3
    bit_clock_forward_jump_ms: int = 60 * 60 * 1000
    bit_clock_backward_jump_ms: int = 30 * 1000
    bit_rollover_overlap_hours: int = 4


@lru_cache()
def get_settings() -> Settings:
    """Return cached application settings."""

    return Settings(
        cors_allow_origins=_parse_origins(os.getenv("SDR_CORS_ALLOW_ORIGINS")),
        seed_mock_tasks=_parse_bool(os.getenv("SDR_SEED_MOCK_TASKS"), True),
        log_level=_parse_log_level(os.getenv("LOG_LEVEL"), "INFO"),
        compression_level=_parse_compression_level(os.getenv("ZSTD_COMPRESSION_LEVEL"), 3),
        bit_db_path=os.getenv("SDR_BIT_DB_PATH", "/tmp/sdr-cockpit/bit"),
        bit_rotation_hours=_parse_int(os.getenv("SDR_BIT_ROTATION_HOURS"), 24),
        bit_max_file_size_mb=_parse_int(os.getenv("SDR_BIT_MAX_FILE_SIZE_MB"), 100),
        bit_max_files=_parse_int(os.getenv("SDR_BIT_MAX_FILES"), 7),
        bit_rollup_bucket_ms=_parse_int(os.getenv("SDR_BIT_ROLLUP_BUCKET_MS"), 10_000),
        bit_top_failing_tests=_parse_int(os.getenv("SDR_BIT_TOP_FAILING_TESTS"), 3),
        bit_clock_forward_jump_ms=_parse_int(
            os.getenv("SDR_BIT_CLOCK_FORWARD_JUMP_MS"), 60 * 60 * 1000
        ),
        bit_clock_backward_jump_ms=_parse_int(
            os.getenv("SDR_BIT_CLOCK_BACKWARD_JUMP_MS"), 30 * 1000
        ),
        bit_rollover_overlap_hours=_parse_int(os.getenv("SDR_BIT_ROLLOVER_OVERLAP_HOURS"), 4),
    )


def reload_settings() -> Settings:
    """Clear cached settings and rebuild from environment."""

    get_settings.cache_clear()
    return get_settings()
