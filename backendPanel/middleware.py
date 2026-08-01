"""Django ASGI middleware to activate a TortoiseContext for each async request."""

from tortoise.context import TortoiseContext


class TortoiseContextMiddleware:
    """
    Wrap each ASGI request in a TortoiseContext so Tortoise ORM 1.x queries work.

    Must be placed LAST in MIDDLEWARE (innermost wrapper, closest to the view).
    django-cors-headers and other sync middlewares must come before this one.
    """

    async_capable = True
    sync_capable = False

    def __init__(self, get_response):
        self.get_response = get_response

    async def __call__(self, request):
        async with TortoiseContext():
            response = await self.get_response(request)
        return response
