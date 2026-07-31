"""Database configuration for Tortoise ORM."""

import os

from tortoise import Tortoise

from app.settings import get_settings

_settings = get_settings()
_db_url = _settings.database_url
if _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgres://", 1)

DATABASE_URL = os.getenv("DATABASE_URL", _db_url)

TORTOISE_ORM = {
    "connections": {"default": DATABASE_URL},
    "apps": {
        "models": {
            "models": ["app.models", "aerich.models"],
            "default_connection": "default",
        },
    },
}


async def init_db() -> None:
    """Initialize Tortoise ORM."""
    await Tortoise.init(config=TORTOISE_ORM)
    await Tortoise.generate_schemas()


async def close_db() -> None:
    """Close Tortoise ORM connections."""
    await Tortoise.close_connections()


