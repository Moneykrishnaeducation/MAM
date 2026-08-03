"""Master URL routing configuration for backendPanel."""

from pathlib import Path

from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.urls import include, path, re_path
from django.views.static import serve

from backendPanel.settings import BASE_DIR, get_settings
from clientPanel.view.login import login_client
from adminPanel.views import (
    get_available_groups,
    get_current_group_config,
    save_group_configuration,
    save_demo_group_configuration
)


def health(request):
    """Health check endpoint."""
    return JsonResponse({"status": "healthy"})


def api_status(request):
    """REST API status endpoint."""
    return JsonResponse({"status": "ok", "framework": "django"})


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
                return HttpResponse(target_path.read_bytes(), content_type="text/html")

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
            return HttpResponse(target_path.read_bytes(), content_type="application/json")
        target_path_direct = Path(d) / path
        if target_path_direct.is_file():
            return HttpResponse(target_path_direct.read_bytes(), content_type="application/json")

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
            content_type = "text/plain"
            if path.endswith(".css"):
                content_type = "text/css"
            elif path.endswith(".js"):
                content_type = "application/javascript"
            res = HttpResponse(target_path.read_bytes(), content_type=content_type)
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


urlpatterns = [
    path("health", health),
    path("api/status", api_status),
    path("api/login", login_client, name="login"),
    path("api/available-groups/", get_available_groups),
    path("api/demo-available-groups/", get_available_groups),
    path("api/current-group-config/", get_current_group_config),
    path("api/save-group-configuration/", save_group_configuration),
    path("api/save-demo-group-configuration/", save_demo_group_configuration),
    path("api/admin/", include("adminPanel.urls")),
    path("api/client/", include("clientPanel.urls")),
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
