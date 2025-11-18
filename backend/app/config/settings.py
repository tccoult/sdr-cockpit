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


@dataclass
class Settings:
    """Runtime configuration for the backend service."""

    cors_allow_origins: List[str] = field(default_factory=lambda: _DEFAULT_ORIGINS)
    seed_mock_tasks: bool = True
    log_level: str = "INFO"
    compression_level: int = 3


@lru_cache()
def get_settings() -> Settings:
    """Return cached application settings."""

    return Settings(
        cors_allow_origins=_parse_origins(os.getenv("SDR_CORS_ALLOW_ORIGINS")),
        seed_mock_tasks=_parse_bool(os.getenv("SDR_SEED_MOCK_TASKS"), True),
        log_level=_parse_log_level(os.getenv("LOG_LEVEL"), "INFO"),
        compression_level=_parse_compression_level(
            os.getenv("ZSTD_COMPRESSION_LEVEL"), 3
        ),
    )


settings = get_settings()
