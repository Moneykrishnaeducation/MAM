"""Main application entry point for backendPanel — runs uvicorn ASGI server."""

import os
from pathlib import Path

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
            "corsheaders",
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
        CORS_ALLOW_ALL_ORIGINS=not _cors_origin,
        CORS_ALLOWED_ORIGINS=[_cors_origin] if _cors_origin else [],
    )
    django.setup()
    Path(_app_settings.media_root).mkdir(parents=True, exist_ok=True)


if __name__ == "__main__":
    import uvicorn
    import threading
    import sys

    # Acquire process lock on the main thread to prevent starting if another instance is running
    try:
        from backendPanel.MPIB_DB import acquire_process_lock, LOCK_FILE

        if not acquire_process_lock():
            print("❌ Another MAM instance is already running!")
            print("   Only one MAM copy trading engine can run at a time.")
            print("   If you're sure no other instance is running, delete the lock file:")
            print(f"   {LOCK_FILE}")
            sys.exit(1)
    except Exception as e:
        print(f"⚠️ Failed to check process lock: {e}")

    # Start MAM copy trading engine in a background thread
    try:
        from backendPanel.MPIB_DB import run_mam_script

        mam_thread = threading.Thread(target=run_mam_script, name="MAM_Engine", daemon=True)
        mam_thread.start()
        print("🚀 Started MAM copy trading engine background thread.")
    except Exception as e:
        print(f"⚠️ Failed to start MAM engine: {e}")

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
