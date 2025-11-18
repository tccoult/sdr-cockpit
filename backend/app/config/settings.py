"""Application settings loaded from environment."""

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


@dataclass
class Settings:
    """Runtime configuration for the backend service."""

    cors_allow_origins: List[str] = field(default_factory=lambda: _DEFAULT_ORIGINS)
    seed_mock_tasks: bool = True


@lru_cache()
def get_settings() -> Settings:
    """Return cached application settings."""

    return Settings(
        cors_allow_origins=_parse_origins(os.getenv("SDR_CORS_ALLOW_ORIGINS")),
        seed_mock_tasks=_parse_bool(os.getenv("SDR_SEED_MOCK_TASKS"), True),
    )


settings = get_settings()
