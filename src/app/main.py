import os

from dotenv import load_dotenv

import django
from django.conf import settings

load_dotenv()

_cors_origin = os.getenv("CORS_ORIGIN")

if not settings.configured:
    settings.configure(
        DEBUG=os.getenv("DEBUG", "true").lower() == "true",
        ROOT_URLCONF=__name__,
        SECRET_KEY=os.getenv("SECRET_KEY", "change-me-in-production"),
        ALLOWED_HOSTS=["*"],
        INSTALLED_APPS=[
            "django.contrib.contenttypes",
            "django.contrib.auth",
            "corsheaders",
        ],
        MIDDLEWARE=[
            "corsheaders.middleware.CorsMiddleware",
            "django.middleware.common.CommonMiddleware",
        ],
        CORS_ALLOW_ALL_ORIGINS=not _cors_origin,
        CORS_ALLOWED_ORIGINS=[_cors_origin] if _cors_origin else [],
    )
    django.setup()

from app.observability import init_sentry
from django.http import JsonResponse
from django.urls import path
from ninja import NinjaAPI
from strawberry.django.views import GraphQLView

from app.graphql_schema import schema as graphql_schema

def root(request):
    """Root endpoint."""
    return JsonResponse({"message": "Welcome to MAM!"})


def health(request):
    """Health check endpoint."""
    return JsonResponse({"status": "healthy"})


ninja_api = NinjaAPI(title="MAM API")


@ninja_api.get("/status")
def api_status(request):
    """REST API status endpoint."""
    return {"status": "ok", "framework": "django-ninja"}




urlpatterns = [
    path("", root),
    path("health", health),
    path("api/", ninja_api.urls),
    path("graphql", GraphQLView.as_view(schema=graphql_schema)),
]

from django.core.wsgi import get_wsgi_application

application = get_wsgi_application()


if __name__ == "__main__":
    from django.core.management import execute_from_command_line
    import sys

    sys.argv = ["manage.py", "runserver", f"{os.getenv('HOST', '0.0.0.0')}:{os.getenv('PORT', '8000')}"]
    execute_from_command_line(sys.argv)
