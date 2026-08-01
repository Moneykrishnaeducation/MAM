"""Database connection and initialization logic for Tortoise ORM in backendPanel."""

from typing import Any

from tortoise import Tortoise

from backendPanel.settings import get_settings


def get_tortoise_config() -> dict[str, Any]:
    """Get Tortoise ORM configuration dictionary."""
    settings = get_settings()
    return {
        "connections": {
            "default": settings.database_url,
        },
        "apps": {
            "models": {
                "models": [
                    "backendPanel.models",
                    "adminPanel.models",
                    "aerich.models",
                ],
                "default_connection": "default",
            },
        },
    }


TORTOISE_ORM = get_tortoise_config()


async def init_db() -> None:
    """Initialize Tortoise ORM database connection."""
    await Tortoise.init(config=TORTOISE_ORM)


async def close_db() -> None:
    """Close Tortoise ORM database connections."""
    await Tortoise.close_connections()
