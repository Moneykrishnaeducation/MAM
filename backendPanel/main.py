"""Main application entry point for backendPanel — runs uvicorn ASGI server."""

import os

from dotenv import load_dotenv

import django
from django.conf import settings

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
            "corsheaders",
            "backendPanel",
            "adminPanel",
            "clientPanel",
        ],
        MIDDLEWARE=[
            "django.middleware.common.CommonMiddleware",
        ],
        CORS_ALLOW_ALL_ORIGINS=not _cors_origin,
        CORS_ALLOWED_ORIGINS=[_cors_origin] if _cors_origin else [],
    )
    django.setup()


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    debug = os.getenv("DEBUG", "true").lower() == "true"

    uvicorn.run(
        "backendPanel.asgi:application",
        host=host,
        port=port,
        reload=debug,
        log_level="info",
        lifespan="on",
    )
