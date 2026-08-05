"""Django middleware to activate a TortoiseContext for each request."""

from __future__ import annotations

from inspect import iscoroutinefunction

from asgiref.sync import async_to_sync
from django.utils.decorators import sync_and_async_middleware
from backendPanel.database import ensure_db_initialized
from tortoise.context import TortoiseContext
from tortoise import Tortoise


@sync_and_async_middleware
def TortoiseContextMiddleware(get_response):
    """Wrap each request in a TortoiseContext so ORM calls stay loop-safe."""
    if iscoroutinefunction(get_response):

        async def middleware(request):
            if not Tortoise._inited:
                await ensure_db_initialized()
            async with TortoiseContext():
                return await get_response(request)

    else:

        def middleware(request):
            if not Tortoise._inited:
                async_to_sync(ensure_db_initialized)()
            with TortoiseContext():
                return get_response(request)

    return middleware
