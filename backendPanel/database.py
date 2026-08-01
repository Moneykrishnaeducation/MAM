"""Database connection and initialization logic for Tortoise ORM in backendPanel."""

import logging
from typing import Any

from tortoise import Tortoise

from backendPanel.settings import get_settings

logger = logging.getLogger("uvicorn.error")

TYPE_MAPPING = {
    "IntField": "INTEGER",
    "BigIntField": "BIGINT",
    "SmallIntField": "SMALLINT",
    "CharField": "VARCHAR(255)",
    "TextField": "TEXT",
    "BooleanField": "BOOLEAN",
    "FloatField": "DOUBLE PRECISION",
    "DecimalField": "NUMERIC(12, 2)",
    "DatetimeField": "TIMESTAMPTZ",
    "DateField": "DATE",
    "JSONField": "JSONB",
}


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


async def auto_sync_db_schema() -> None:
    """Compare Tortoise ORM models against PostgreSQL and auto-add missing columns."""
    conn = Tortoise.get_connection("default")
    modified_count = 0
    for app in Tortoise.apps.values():
        for model in app.values():
            table_name = getattr(model._meta, "db_table", None)
            if not table_name:
                continue

            try:
                res = await conn.execute_query(
                    f"SELECT column_name FROM information_schema.columns WHERE table_name='{table_name}'"
                )
                existing_cols = {r["column_name"] for r in res[1]}
                if not existing_cols:
                    continue

                for col_name in model._meta.db_fields:
                    if col_name not in existing_cols:
                        field = model._meta.fields_map.get(col_name)
                        if not field:
                            continue
                        field_class_name = field.__class__.__name__
                        col_type = TYPE_MAPPING.get(field_class_name, "VARCHAR(255)")
                        default_clause = ""
                        if field.default is not None and not callable(field.default):
                            if isinstance(field.default, bool):
                                default_clause = f" DEFAULT {str(field.default).upper()}"
                            elif isinstance(field.default, (int, float)):
                                default_clause = f" DEFAULT {field.default}"
                            elif isinstance(field.default, str):
                                default_clause = f" DEFAULT '{field.default}'"

                        alter_sql = f'ALTER TABLE "{table_name}" ADD COLUMN IF NOT EXISTS "{col_name}" {col_type}{default_clause};'
                        await conn.execute_query(alter_sql)
                        modified_count += 1
                        logger.info(
                            f"[DB AUTO-SYNC] Synchronized table '{table_name}' -> added column '{col_name}' ({col_type})"
                        )
            except Exception as e:
                logger.warning(f"[DB AUTO-SYNC] Warning checking table '{table_name}': {e}")

    if modified_count > 0:
        logger.info(f"[DB AUTO-SYNC] Schema sync complete. Applied {modified_count} database modification(s).")
    else:
        logger.info("[DB AUTO-SYNC] Schema sync complete. Database tables and columns are up to date.")


async def ensure_db_initialized() -> None:
    """Ensure Tortoise ORM is initialized before executing database queries."""
    if not Tortoise._inited:
        await Tortoise.init(config=TORTOISE_ORM)
        await Tortoise.generate_schemas(safe=True)
        await auto_sync_db_schema()


async def init_db() -> None:
    """Initialize Tortoise ORM database connection."""
    await Tortoise.init(config=TORTOISE_ORM)


async def close_db() -> None:
    """Close Tortoise ORM database connections."""
    await Tortoise.close_connections()
