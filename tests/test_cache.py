"""Unit tests for backendPanel.cache module."""

import pytest

from backendPanel.cache import delete_cache, get_cache, set_cache


@pytest.mark.asyncio
async def test_cache_set_get_delete():
    """Test setting, getting, and deleting cache values."""
    key = "test_key_123"
    value = {"user": "admin", "role": "superadmin"}

    # Set cache
    await set_cache(key, value, ttl=60)

    # Get cache
    retrieved = await get_cache(key)
    assert retrieved == value

    # Delete cache
    await delete_cache(key)
    retrieved_after_delete = await get_cache(key)
    assert retrieved_after_delete is None
