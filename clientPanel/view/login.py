"""Client login endpoint for clientPanel."""

import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from adminPanel.models import ClientProfile, ClientUser
from clientPanel.view.common import (
    _error,
    _serialize_client_profile,
    create_client_login_token,
    verify_client_password,
)


def _serialize_client_user(user: ClientUser, profile: ClientProfile | None = None) -> dict:
    return {
        "id": user.id,
        "user_code": user.user_code,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "status": user.status,
        "verified": user.verified,
        "country": user.country,
        "avatar": user.avatar,
        "joined": user.joined.strftime("%Y-%m-%d") if user.joined else None,
        "profile": _serialize_client_profile(profile) if profile else None,
    }


@csrf_exempt
@require_http_methods(["POST"])
async def login_client(request):
    """Authenticate a client with email and access code."""
    try:
        body = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, ValueError):
        return _error("Invalid JSON body", status=400)

    email = str(body.get("email", "")).strip().lower()
    access_code = str(
        body.get("password")
        or body.get("access_code")
        or body.get("user_code")
        or body.get("client_code")
        or ""
    ).strip()

    if not email or not access_code:
        return _error("email and access_code are required", status=400)

    user = await ClientUser.filter(email=email).first()
    if user is None:
        return _error("Invalid credentials", status=401)

    password_login = bool(user.password_hash) and verify_client_password(access_code, user.password_hash)
    access_code_login = bool(user.user_code) and user.user_code == access_code
    if not password_login and not access_code_login:
        return _error("Invalid credentials", status=401)

    profile = await ClientProfile.filter(user_id=user.id).first()
    if profile is None:
        return _error("Client profile not found", status=404)

    token = create_client_login_token(user.id, user.email)

    return JsonResponse(
        {
            "status": "ok",
            "message": "Client login successful",
            "token": token,
            "token_type": "Bearer",
            "client": _serialize_client_user(user, profile),
            "profile": _serialize_client_profile(profile),
        }
    )
