"""Client login endpoint for clientPanel."""

import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from adminPanel.models import ClientProfile, ClientUser
from clientPanel.crud import create_client_profile
from clientPanel.view.common import (
    ADMIN_LOGIN_COOKIE_NAME,
    ADMIN_LOGIN_MAX_AGE,
    CLIENT_LOGIN_COOKIE_NAME,
    CLIENT_LOGIN_MAX_AGE,
    _error,
    _serialize_client_profile,
    create_admin_login_token,
    create_client_login_token,
    set_auth_cookies,
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


def _serialize_admin_user(user: ClientUser) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "department": user.department,
        "permissions": user.permissions or [],
        "status": user.status,
        "verified": user.verified,
        "country": user.country,
        "avatar": user.avatar,
        "joined": user.joined.strftime("%Y-%m-%d") if user.joined else None,
    }


def _request_is_secure(request) -> bool:
    is_secure = getattr(request, "is_secure", None)
    if callable(is_secure):
        return bool(is_secure())
    return False


@csrf_exempt
@require_http_methods(["POST"])
async def login_client(request):
    """Authenticate a client or admin with email and password."""
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

    role_value = str(user.role or "").strip().lower()
    is_admin = "admin" in role_value
    password_login = bool(user.password_hash) and verify_client_password(access_code, user.password_hash)
    access_code_login = bool(user.user_code) and user.user_code == access_code
    if is_admin:
        if not password_login:
            return _error("Invalid credentials", status=401)
    elif not password_login and not access_code_login:
        return _error("Invalid credentials", status=401)

    if is_admin:
        token = create_admin_login_token(user.id, user.email, user.role)
        response = JsonResponse(
            {
                "status": "ok",
                "message": "Admin login successful",
                "token_type": "Bearer",
                "token": token,
                "access_token": token,
                "jwt_token": token,
                "refresh_token": token,
                "role": "Admin",
                "admin": _serialize_admin_user(user),
            }
        )
        return set_auth_cookies(
            response,
            token=token,
            user_id=user.id,
            role="Admin",
            max_age=ADMIN_LOGIN_MAX_AGE,
            secure=_request_is_secure(request),
            legacy_cookie_name=ADMIN_LOGIN_COOKIE_NAME,
        )

    profile = await ClientProfile.filter(user_id=user.id).first()
    if profile is None:
        profile = await create_client_profile(
            user.id,
            user.name,
            user.email,
            phone=user.phone,
            country=user.country,
        )

    token = create_client_login_token(user.id, user.email)

    response = JsonResponse(
        {
            "status": "ok",
            "message": "Client login successful",
            "token_type": "Bearer",
            "token": token,
            "access_token": token,
            "jwt_token": token,
            "refresh_token": token,
            "role": "Client",
            "client": _serialize_client_user(user, profile),
            "profile": _serialize_client_profile(profile),
        }
    )
    return set_auth_cookies(
        response,
        token=token,
        user_id=user.id,
        role="Client",
        max_age=CLIENT_LOGIN_MAX_AGE,
        secure=_request_is_secure(request),
        legacy_cookie_name=CLIENT_LOGIN_COOKIE_NAME,
    )
