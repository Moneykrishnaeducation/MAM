"""Application settings using pydantic-settings in backendPanel."""

from functools import lru_cache
from pathlib import Path
from typing import Any

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base directory relative to project root
BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application settings
    app_name: str = "MAM Backend"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000

    # API settings
    api_prefix: str = "/api"
    api_version: str = "v1"

    # Static files settings (configured from base directory)
    static_url: str = "/static/"
    static_root: Path = Field(
        default_factory=lambda: BASE_DIR / "staticfiles",
        alias="STATIC_ROOT",
    )
    staticfiles_dirs: list[Path] = Field(
        default_factory=lambda: [
            d
            for d in [
                BASE_DIR / "static",
                BASE_DIR / "Frontend" / "apps" / "web" / "out",
                BASE_DIR / "Frontend" / "apps" / "web" / "public",
            ]
            if d.exists()
        ],
        alias="STATICFILES_DIRS",
    )

    # Database settings
    db_engine: str = Field(
        default="django.db.backends.postgresql",
        alias="DB_ENGINE",
    )
    db_name: str = Field(alias="DB_NAME")
    db_user: str = Field(alias="DB_USER")
    db_password: str = Field(alias="DB_PASSWORD")
    db_host: str = Field(alias="DB_HOST")
    db_port: int = Field(alias="DB_PORT")
    db_conn_max_age: int = Field(alias="DB_CONN_MAX_AGE")
    db_conn_health_checks: bool = Field(alias="DB_CONN_HEALTH_CHECKS")
    db_atomic_requests: bool = Field(alias="DB_ATOMIC_REQUESTS")
    database_url: str = Field(alias="DATABASE_URL")

    @property
    def databases(self) -> dict[str, Any]:
        """Django DATABASES configuration dictionary."""
        if "sqlite" in self.db_engine:
            return {
                "default": {
                    "ENGINE": self.db_engine,
                    "NAME": (
                        self.db_name
                        if self.db_name.endswith(".db") or "/" in self.db_name
                        else "app.db"
                    ),
                }
            }
        return {
            "default": {
                "ENGINE": self.db_engine,
                "NAME": self.db_name,
                "USER": self.db_user,
                "PASSWORD": self.db_password,
                "HOST": self.db_host,
                "PORT": str(self.db_port),
                "CONN_MAX_AGE": self.db_conn_max_age,
                "CONN_HEALTH_CHECKS": self.db_conn_health_checks,
                "ATOMIC_REQUESTS": self.db_atomic_requests,
            }
        }


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


DATABASES = get_settings().databases
