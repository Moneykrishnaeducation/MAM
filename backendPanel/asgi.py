"""ASGI entry point for backendPanel with Tortoise ORM lifespan management."""

import logging
import os
from pathlib import Path

import django
from django.conf import settings
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("uvicorn.error")
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
        EMAIL_BACKEND=_app_settings.email_settings["EMAIL_BACKEND"],
        EMAIL_HOST=_app_settings.email_settings["EMAIL_HOST"],
        EMAIL_PORT=_app_settings.email_settings["EMAIL_PORT"],
        EMAIL_USE_TLS=_app_settings.email_settings["EMAIL_USE_TLS"],
        EMAIL_USE_SSL=_app_settings.email_settings["EMAIL_USE_SSL"],
        EMAIL_HOST_USER=_app_settings.email_settings["EMAIL_HOST_USER"],
        EMAIL_HOST_PASSWORD=_app_settings.email_settings["EMAIL_HOST_PASSWORD"],
        DEFAULT_FROM_EMAIL=_app_settings.email_settings["DEFAULT_FROM_EMAIL"],
        FRONTEND_BASE_URL=_app_settings.frontend_base_url,
        STATIC_URL=_app_settings.static_url,
        STATIC_ROOT=str(_app_settings.static_root),
        STATICFILES_DIRS=[str(d) for d in _app_settings.staticfiles_dirs],
        TEMPLATES=[
            {
                "BACKEND": "django.template.backends.django.DjangoTemplates",
                "DIRS": [str(_app_settings.templates_dir)],
                "APP_DIRS": True,
                "OPTIONS": {
                    "context_processors": [],
                },
            }
        ],
        DATA_UPLOAD_MAX_MEMORY_SIZE=_app_settings.data_upload_max_memory_size,
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
            "backendPanel.middleware.TortoiseContextMiddleware",
        ],
        MEDIA_URL=_app_settings.media_url,
        MEDIA_ROOT=str(_app_settings.media_root),
    )
    django.setup()
    Path(_app_settings.media_root).mkdir(parents=True, exist_ok=True)

from django.core.asgi import get_asgi_application  # noqa: E402
from tortoise.context import TortoiseContext, set_global_context  # noqa: E402

from backendPanel.database import TORTOISE_ORM, auto_sync_db_schema  # noqa: E402

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
                    logger.info("[STARTUP] Checking database schema & auto-syncing model modifications...")
                    await ctx.generate_schemas(safe=True)
                    await auto_sync_db_schema()
                    set_global_context(ctx)
                    _global_tortoise_ctx = ctx
                    try:
                        from adminPanel.view.balance_sync import start_balance_sync_thread
                        logger.info("[STARTUP] Initializing MT5 Account Balance Sync thread...")
                        start_balance_sync_thread(interval_seconds=5.0)
                    except Exception as sync_err:
                        logger.warning(f"[STARTUP] Could not start balance sync thread: {sync_err}")
                    try:
                        from backendPanel.mail_queue import start_mail_queue_thread
                        logger.info("[STARTUP] Initializing mail queue worker thread...")
                        start_mail_queue_thread(interval_seconds=5.0, batch_size=100)
                    except Exception as mail_err:
                        logger.warning(f"[STARTUP] Could not start mail queue thread: {mail_err}")
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
