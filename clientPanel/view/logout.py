"""Client logout endpoint."""

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from adminPanel.audit import create_audit_log
from adminPanel.models import ClientUser
from backendPanel.database import ensure_db_initialized
from clientPanel.view.common import (
    AUTH_ACCESS_COOKIE_NAME,
    AUTH_JWT_COOKIE_NAME,
    AUTH_REFRESH_COOKIE_NAME,
    AUTH_ROLE_COOKIE_NAME,
    AUTH_USER_ID_COOKIE_NAME,
    CLIENT_LOGIN_COOKIE_NAME,
    get_client_request_token,
    load_client_login_token,
)


@csrf_exempt
@require_http_methods(["POST"])
async def logout_client(request):
    """Clear all client auth cookies and end the session."""
    await ensure_db_initialized()

    token = get_client_request_token(request)
    if token:
        payload = load_client_login_token(token)
        if payload:
            user_id = payload.get("user_id")
            user = await ClientUser.filter(id=int(user_id)).first() if user_id is not None else None
            if user is not None:
                await create_audit_log(
                    request,
                    user_name=user.name,
                    user_email=user.email,
                    user_role="Client",
                    action_type="Logout",
                    module_name="Authentication",
                    record_id=str(user.id),
                    new_values={
                        "email": user.email,
                        "status": user.status,
                        "role": "Client",
                        "event": "client_logout",
                    },
                    user_id=user.id,
                )

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
