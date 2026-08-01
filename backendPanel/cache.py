"""Cache management module using Upstash Redis with fallback in-memory store."""

import json
from typing import Any

from upstash_redis import Redis

from backendPanel.settings import get_settings

_in_memory_store: dict[str, Any] = {}
_redis_client: Redis | None = None
_redis_initialized: bool = False


def get_redis_client() -> Redis | None:
    """Initialize and return Upstash Redis client if configured."""
    global _redis_client, _redis_initialized
    if _redis_initialized:
        return _redis_client

    _redis_initialized = True
    settings = get_settings()
    url = settings.upstash_redis_rest_url
    token = settings.upstash_redis_rest_token

    if url and token and "your-upstash" not in url and "your_upstash" not in token:
        try:
            _redis_client = Redis(url=url, token=token)
        except Exception:
            _redis_client = None

    return _redis_client


async def get_cache(key: str) -> Any | None:
    """Get value from Upstash Redis or fallback in-memory cache."""
    redis = get_redis_client()
    if redis:
        try:
            val = redis.get(key)
            if val is not None and isinstance(val, str):
                try:
                    return json.loads(val)
                except (json.JSONDecodeError, TypeError):
                    return val
            return val
        except Exception:
            pass

    return _in_memory_store.get(key)


async def set_cache(key: str, value: Any, ttl: int = 300) -> None:
    """Set value in Upstash Redis or fallback in-memory cache with TTL (seconds)."""
    redis = get_redis_client()
    if redis:
        try:
            val_str = json.dumps(value) if not isinstance(value, (str, int, float)) else str(value)
            redis.set(key, val_str, ex=ttl)
            return
        except Exception:
            pass

    _in_memory_store[key] = value


async def delete_cache(key: str) -> None:
    """Delete value from Upstash Redis or fallback in-memory cache."""
    redis = get_redis_client()
    if redis:
        try:
            redis.delete(key)
        except Exception:
            pass

    _in_memory_store.pop(key, None)
