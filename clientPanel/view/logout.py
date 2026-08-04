"""Client logout endpoint."""

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from clientPanel.view.common import (
    AUTH_ACCESS_COOKIE_NAME,
    AUTH_JWT_COOKIE_NAME,
    AUTH_REFRESH_COOKIE_NAME,
    AUTH_ROLE_COOKIE_NAME,
    AUTH_USER_ID_COOKIE_NAME,
    CLIENT_LOGIN_COOKIE_NAME,
)


@csrf_exempt
@require_http_methods(["POST"])
async def logout_client(request):
    """Clear all client auth cookies and end the session."""
    response = JsonResponse({"status": "ok", "message": "Logged out successfully"})
    cookie_names = (
        CLIENT_LOGIN_COOKIE_NAME,
        AUTH_ACCESS_COOKIE_NAME,
        AUTH_JWT_COOKIE_NAME,
        AUTH_REFRESH_COOKIE_NAME,
        AUTH_ROLE_COOKIE_NAME,
        AUTH_USER_ID_COOKIE_NAME,
    )

    for cookie_name in cookie_names:
        response.delete_cookie(cookie_name, path="/")

    return response
