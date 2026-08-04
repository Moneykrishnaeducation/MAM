"""Master URL routing configuration for backendPanel."""

import mimetypes
from pathlib import Path

from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.urls import include, path, re_path

from adminPanel.views import (
    get_available_groups,
    get_current_group_config,
    save_demo_group_configuration,
    save_group_configuration,
)
from backendPanel.settings import get_settings
from backendPanel.static_frontend import (
    STATIC_FRONTEND_DIR,
    get_frontend_static_dirs,
    iter_frontend_candidates,
)
from adminPanel.view.symbol_timing import symbol_timing
from clientPanel.view.login import login_client


def health(request):
    """Health check endpoint."""
    return JsonResponse({"status": "healthy"})


def api_status(request):
    """REST API status endpoint."""
    return JsonResponse({"status": "ok", "framework": "django"})


def serve_frontend_page(request, route=""):
    """Serve exported static HTML frontend pages from static/frontend."""
    _app_settings = get_settings()
    search_dirs = [
        *_app_settings.staticfiles_dirs,
        _app_settings.static_root,
        *get_frontend_static_dirs(),
    ]
    candidates = iter_frontend_candidates(route)

    for d in search_dirs:
        base_path = Path(d)
        for c in candidates:
            target_path = base_path / c
            if target_path.is_file():
                return HttpResponse(target_path.read_bytes(), content_type="text/html")

    return JsonResponse({"message": "Welcome to MAM Backend!"})


def serve_next_data(request, path=""):
    """Handle Next.js client-side Link prefetch data requests (/_next/data/...)."""
    _app_settings = get_settings()
    search_dirs = [
        *_app_settings.staticfiles_dirs,
        _app_settings.static_root,
        *get_frontend_static_dirs(),
    ]
    for d in search_dirs:
        target_path = Path(d) / "_next" / "data" / path
        if target_path.is_file():
            return HttpResponse(target_path.read_bytes(), content_type="application/json")
        target_path_direct = Path(d) / path
        if target_path_direct.is_file():
            return HttpResponse(target_path_direct.read_bytes(), content_type="application/json")

    return JsonResponse({})


def serve_file_response(path: Path, content_type: str | None = None):
    if not path.is_file():
        return None
    if content_type is None:
        content_type = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
    response = HttpResponse(path.read_bytes(), content_type=content_type)
    response["Content-Length"] = str(path.stat().st_size)
    return response


def is_safe_path(base: Path, target: Path) -> bool:
    try:
        return target.resolve().is_relative_to(base.resolve())
    except AttributeError:
        return str(target.resolve()).startswith(str(base.resolve()) + str(Path("/")))


def serve_next_static(request, path=""):
    """Serve Next.js static JS/CSS asset bundles with aggressive browser caching."""
    _app_settings = get_settings()
    search_dirs = [
        Path(settings.STATIC_ROOT) / "_next",
        *(directory / "_next" for directory in get_frontend_static_dirs()),
        *_app_settings.staticfiles_dirs,
    ]
    for d in search_dirs:
        target_path = Path(d) / path
        if target_path.is_file():
            content_type = "text/plain"
            if path.endswith(".css"):
                content_type = "text/css"
            elif path.endswith(".js"):
                content_type = "application/javascript"
            res = serve_file_response(target_path, content_type=content_type)
            if res is not None:
                res["Cache-Control"] = "public, max-age=31536000, immutable"
                return res

    target_root = Path(settings.STATIC_ROOT) / "_next"
    if not target_root.exists():
        target_root = STATIC_FRONTEND_DIR / "_next"
    target_path = target_root / path
    response = serve_file_response(target_path)
    if response is not None:
        response["Cache-Control"] = "public, max-age=31536000, immutable"
        return response
    return JsonResponse({"detail": "Not found"}, status=404)


def serve_media_file(request, path=""):
    media_root = Path(settings.MEDIA_ROOT)
    target_path = (media_root / path).resolve()
    if not is_safe_path(media_root, target_path):
        return JsonResponse({"detail": "Not found"}, status=404)
    response = serve_file_response(target_path)
    if response is None:
        return JsonResponse({"detail": "Not found"}, status=404)
    return response


def serve_static_file(request, path=""):
    static_root = Path(settings.STATIC_ROOT)
    target_path = (static_root / path).resolve()
    if not is_safe_path(static_root, target_path):
        return JsonResponse({"detail": "Not found"}, status=404)
    response = serve_file_response(target_path)
    if response is None:
        return JsonResponse({"detail": "Not found"}, status=404)
    return response


urlpatterns = [
    path("health", health),
    path("api/status", api_status),
    path("api/login", login_client, name="login"),
    path("api/symbol-timing/", symbol_timing, name="symbol-timing"),
    path("api/available-groups/", get_available_groups),
    path("api/demo-available-groups/", get_available_groups),
    path("api/current-group-config/", get_current_group_config),
    path("api/save-group-configuration/", save_group_configuration),
    path("api/save-demo-group-configuration/", save_demo_group_configuration),
    path("api/admin/", include("adminPanel.urls")),
    path("api/client/", include("clientPanel.urls")),
    re_path(r"^_next/data/(?P<path>.*)$", serve_next_data),
    re_path(r"^_next/(?P<path>.*)$", serve_next_static),
    re_path(r"^media/(?P<path>.*)$", serve_media_file),
    re_path(r"^static/(?P<path>.*)$", serve_static_file),
    path("", serve_frontend_page),
    re_path(r"^(?P<route>.*)$", serve_frontend_page),
]
