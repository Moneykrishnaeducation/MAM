"""ASGI entry point for backendPanel with Tortoise ORM lifespan management."""

import os

import django
from django.conf import settings
from dotenv import load_dotenv

load_dotenv()

_cors_origin = os.getenv("CORS_ORIGIN")

if not settings.configured:
    from backendPanel.settings import get_settings

    _app_settings = get_settings()
    settings.configure(
        DEBUG=os.getenv("DEBUG", "true").lower() == "true",
        ROOT_URLCONF="backendPanel.urls",
        SECRET_KEY=os.getenv("SECRET_KEY", "change-me-in-production"),
        ALLOWED_HOSTS=["*"],
        DATABASES=_app_settings.databases,
        STATIC_URL=_app_settings.static_url,
        STATIC_ROOT=str(_app_settings.static_root),
        STATICFILES_DIRS=[str(d) for d in _app_settings.staticfiles_dirs],
        INSTALLED_APPS=[
            "django.contrib.contenttypes",
            "django.contrib.auth",
            "django.contrib.staticfiles",
            "backendPanel",
            "adminPanel",
            "clientPanel",
        ],
        MIDDLEWARE=[
            "django.middleware.common.CommonMiddleware",
        ],
    )
    django.setup()

from django.core.asgi import get_asgi_application  # noqa: E402
from tortoise.context import TortoiseContext, set_global_context  # noqa: E402

from backendPanel.database import TORTOISE_ORM  # noqa: E402

_django_asgi = get_asgi_application()

_cors_allow_all = not _cors_origin
_cors_origin_value = _cors_origin or "*"

# Global Tortoise context — initialized on startup and reused by all requests
_global_tortoise_ctx: TortoiseContext | None = None


async def application(scope, receive, send):
    """ASGI application with Tortoise lifespan and CORS headers."""
    if scope["type"] == "lifespan":
        global _global_tortoise_ctx
        ctx = TortoiseContext()
        # Activate the context so init() can run inside it
        ctx.__enter__()
        try:
            while True:
                message = await receive()
                if message["type"] == "lifespan.startup":
                    await ctx.init(config=TORTOISE_ORM)
                    await ctx.generate_schemas(safe=True)
                    set_global_context(ctx)
                    _global_tortoise_ctx = ctx
                    await send({"type": "lifespan.startup.complete"})
                elif message["type"] == "lifespan.shutdown":
                    if _global_tortoise_ctx is not None:
                        await _global_tortoise_ctx.close_connections()
                    await send({"type": "lifespan.shutdown.complete"})
                    return
        finally:
            ctx.__exit__(None, None, None)

    elif scope["type"] == "http":
        # Apply CORS headers to every HTTP response
        async def send_with_cors(message):
            if message["type"] == "http.response.start":
                cors_headers = [
                    (b"access-control-allow-origin", _cors_origin_value.encode()),
                    (b"access-control-allow-methods", b"GET, POST, PUT, PATCH, DELETE, OPTIONS"),
                    (b"access-control-allow-headers", b"Content-Type, Authorization"),
                ]
                message = {**message, "headers": list(message.get("headers", [])) + cors_headers}
            await send(message)

        # Respond immediately to CORS preflight OPTIONS requests
        if scope.get("method") == "OPTIONS":
            await send_with_cors({
                "type": "http.response.start",
                "status": 204,
                "headers": [],
            })
            await send({"type": "http.response.body", "body": b""})
            return

        await _django_asgi(scope, receive, send_with_cors)

    else:
        await _django_asgi(scope, receive, send)
