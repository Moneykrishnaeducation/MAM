"""Application settings using pydantic-settings in backendPanel."""

from functools import lru_cache
from pathlib import Path
from typing import Any

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from backendPanel.static_frontend import get_frontend_static_dirs

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
    mt5_default_agent: int = Field(default=426, alias="MT5_DEFAULT_AGENT")

    @field_validator("debug", mode="before")
    def parse_debug(cls, value: Any) -> bool:
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.strip().lower() in {"1", "true", "yes", "on", "dev", "debug"}
        return False

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
                BASE_DIR / "Frontend" / "apps" / "web" / "public",
                *get_frontend_static_dirs(),
            ]
            if d.exists()
        ],
        alias="STATICFILES_DIRS",
    )
    media_url: str = "/media/"
    media_root: Path = Field(
        default_factory=lambda: BASE_DIR / "media",
        alias="MEDIA_ROOT",
    )
    data_upload_max_memory_size: int = 10485760

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

    # Upstash Redis settings
    upstash_redis_rest_url: str | None = Field(
        default=None,
        alias="UPSTASH_REDIS_REST_URL",
    )
    upstash_redis_rest_token: str | None = Field(
        default=None,
        alias="UPSTASH_REDIS_REST_TOKEN",
    )

    # Email settings
    email_backend: str = Field(
        default="django.core.mail.backends.smtp.EmailBackend",
        alias="EMAIL_BACKEND",
    )
    email_host: str = Field(default="smtp.gmail.com", alias="EMAIL_HOST")
    email_port: int = Field(default=587, alias="EMAIL_PORT")
    email_use_tls: bool = Field(default=True, alias="EMAIL_USE_TLS")
    email_use_ssl: bool = Field(default=False, alias="EMAIL_USE_SSL")
    email_host_user: str = Field(default="", alias="EMAIL_HOST_USER")
    email_host_password: str = Field(default="", alias="EMAIL_HOST_PASSWORD")
    default_from_email: str = Field(default="", alias="DEFAULT_FROM_EMAIL")

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

    @property
    def email_settings(self) -> dict[str, Any]:
        """Django email configuration dictionary."""
        return {
            "EMAIL_BACKEND": self.email_backend,
            "EMAIL_HOST": self.email_host,
            "EMAIL_PORT": self.email_port,
            "EMAIL_USE_TLS": self.email_use_tls,
            "EMAIL_USE_SSL": self.email_use_ssl,
            "EMAIL_HOST_USER": self.email_host_user,
            "EMAIL_HOST_PASSWORD": self.email_host_password,
            "DEFAULT_FROM_EMAIL": self.default_from_email or self.email_host_user,
        }


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


DATABASES = get_settings().databases
MT5_DEFAULT_AGENT = get_settings().mt5_default_agent
