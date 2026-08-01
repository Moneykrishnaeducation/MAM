"""Database connection and initialization logic for Tortoise ORM in backendPanel."""

from typing import Any

from tortoise import Tortoise

from backendPanel.settings import get_settings


def get_tortoise_config() -> dict[str, Any]:
    """Get Tortoise ORM configuration dictionary."""
    settings = get_settings()
    db_url = settings.database_url
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgres://", 1)
    return {
        "connections": {
            "default": db_url,
        },
        "apps": {
            "models": {
                "models": [
                    "adminPanel.models",
                ],
                "default_connection": "default",
            },
        },
    }


TORTOISE_ORM = get_tortoise_config()


async def ensure_db_initialized() -> None:
    """Ensure Tortoise ORM is initialized before executing database queries."""
    if not Tortoise._inited:
        await Tortoise.init(config=TORTOISE_ORM)
        await Tortoise.generate_schemas(safe=True)


async def init_db() -> None:
    """Initialize Tortoise ORM database connection."""
    await Tortoise.init(config=TORTOISE_ORM)


async def close_db() -> None:
    """Close Tortoise ORM database connections."""
    await Tortoise.close_connections()
