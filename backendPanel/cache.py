"""Cache management module for backendPanel."""

from typing import Any

_cache_store: dict[str, Any] = {}


async def get_cache(key: str) -> Any | None:
    """Get value from in-memory cache."""
    return _cache_store.get(key)


async def set_cache(key: str, value: Any, ttl: int = 300) -> None:
    """Set value in in-memory cache."""
    _cache_store[key] = value


async def delete_cache(key: str) -> None:
    """Delete value from in-memory cache."""
    _cache_store.pop(key, None)
