"""Main application entry point for backendPanel."""

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
            "corsheaders.middleware.CorsMiddleware",
            "django.middleware.common.CommonMiddleware",
        ],
        CORS_ALLOW_ALL_ORIGINS=not _cors_origin,
        CORS_ALLOWED_ORIGINS=[_cors_origin] if _cors_origin else [],
    )
    django.setup()

from django.core.wsgi import get_wsgi_application  # noqa: E402

application = get_wsgi_application()


if __name__ == "__main__":
    import sys
    from django.core.management import execute_from_command_line

    if len(sys.argv) == 1:
        sys.argv = [
            "manage.py",
            "runserver",
            f"{os.getenv('HOST', '0.0.0.0')}:{os.getenv('PORT', '8000')}",
        ]
    execute_from_command_line(sys.argv)
