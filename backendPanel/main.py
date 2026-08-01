"""Main application entry point for backendPanel."""

import os
from pathlib import Path

from dotenv import load_dotenv

import django
from django.conf import settings

load_dotenv()

_cors_origin = os.getenv("CORS_ORIGIN")

if not settings.configured:
    from backendPanel.settings import BASE_DIR, get_settings

    _app_settings = get_settings()
    settings.configure(
        DEBUG=os.getenv("DEBUG", "true").lower() == "true",
        ROOT_URLCONF=__name__,
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

from django.core.wsgi import get_wsgi_application
from django.http import FileResponse, JsonResponse
from django.urls import path, re_path
from django.views.static import serve
from ninja import NinjaAPI

from backendPanel.settings import BASE_DIR, get_settings


def serve_frontend_page(request, route=""):
    """Serve exported static HTML frontend pages or fallback to SPA index.html."""
    _app_settings = get_settings()
    search_dirs = [
        *_app_settings.staticfiles_dirs,
        _app_settings.static_root,
        BASE_DIR / "Frontend" / "apps" / "web" / "out",
    ]

    clean_route = route.strip("/")
    candidates = []
    if clean_route:
        candidates.extend([
            f"{clean_route}.html",
            f"{clean_route}/index.html",
            clean_route,
        ])
    else:
        candidates.append("index.html")

    candidates.append("index.html")

    for d in search_dirs:
        base_path = Path(d)
        for c in candidates:
            target_path = base_path / c
            if target_path.is_file():
                return FileResponse(open(target_path, "rb"), content_type="text/html")

    return JsonResponse({"message": "Welcome to MAM Backend!"})


def serve_next_data(request, path=""):
    """Handle Next.js client-side Link prefetch data requests (/_next/data/...)."""
    _app_settings = get_settings()
    search_dirs = [
        *_app_settings.staticfiles_dirs,
        _app_settings.static_root,
        BASE_DIR / "Frontend" / "apps" / "web" / "out",
    ]
    for d in search_dirs:
        target_path = Path(d) / "_next" / "data" / path
        if target_path.is_file():
            return FileResponse(open(target_path, "rb"), content_type="application/json")
        target_path_direct = Path(d) / path
        if target_path_direct.is_file():
            return FileResponse(open(target_path_direct, "rb"), content_type="application/json")

    return JsonResponse({})


def serve_next_static(request, path=""):
    """Serve Next.js static JS/CSS asset bundles with aggressive browser caching."""
    _app_settings = get_settings()
    search_dirs = [
        Path(settings.STATIC_ROOT) / "_next",
        BASE_DIR / "Frontend" / "apps" / "web" / "out" / "_next",
        *_app_settings.staticfiles_dirs,
    ]
    for d in search_dirs:
        target_path = Path(d) / path
        if target_path.is_file():
            res = FileResponse(open(target_path, "rb"))
            if path.endswith(".css"):
                res["Content-Type"] = "text/css"
            elif path.endswith(".js"):
                res["Content-Type"] = "application/javascript"
            res["Cache-Control"] = "public, max-age=31536000, immutable"
            return res

    return serve(
        request,
        path,
        document_root=str(
            Path(settings.STATIC_ROOT) / "_next"
            if (Path(settings.STATIC_ROOT) / "_next").exists()
            else BASE_DIR / "Frontend" / "apps" / "web" / "out" / "_next"
        ),
    )


def health(request):
    """Health check endpoint."""
    return JsonResponse({"status": "healthy"})


ninja_api = NinjaAPI(title="MAM Backend API")


@ninja_api.get("/status")
def api_status(request):
    """REST API status endpoint."""
    return {"status": "ok", "framework": "django-ninja"}


# Import adminPanel & clientPanel routers dynamically
try:
    from adminPanel.views import router as admin_router
    ninja_api.add_router("/admin", admin_router)
except ImportError:
    pass

try:
    from clientPanel.views import router as client_router
    ninja_api.add_router("/client", client_router)
except ImportError:
    pass


urlpatterns = [
    path("health", health),
    path("api/", ninja_api.urls),
    re_path(r"^_next/data/(?P<path>.*)$", serve_next_data),
    re_path(r"^_next/(?P<path>.*)$", serve_next_static),
    re_path(
        r"^static/(?P<path>.*)$",
        serve,
        {"document_root": str(settings.STATIC_ROOT)},
    ),
    path("", serve_frontend_page),
    re_path(r"^(?P<route>.*)$", serve_frontend_page),
]

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
