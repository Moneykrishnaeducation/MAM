"""Client and admin login endpoints."""

import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from adminPanel.models import AdminUser, ClientUser
from adminPanel.audit import create_audit_log
from backendPanel.database import ensure_db_initialized
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

# Valid admin roles stored in AdminUser.role (canonical title-case)
_VALID_ADMIN_ROLES: frozenset[str] = frozenset({"Admin", "SuperAdmin", "Viewer"})

# Map any casing variant → canonical title-case
_ROLE_CANONICAL: dict[str, str] = {
    "admin": "Admin",
    "superadmin": "SuperAdmin",
    "super_admin": "SuperAdmin",
    "super admin": "SuperAdmin",
    "viewer": "Viewer",
}


def _canonicalize_admin_role(raw: str) -> str | None:
    """Return canonical title-case role or None if not a valid admin role."""
    return _ROLE_CANONICAL.get(raw.strip().lower().replace("-", "").replace(" ", ""))


def _serialize_client_user(user: ClientUser) -> dict:
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
        "profile": _serialize_client_profile(user),
    }


def _serialize_admin_user(user: AdminUser) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "department": user.department,
        "permissions": user.permissions or [],
        "status": user.status,
        "avatar": user.avatar,
        "last_login": user.last_login.strftime("%Y-%m-%d %H:%M:%S") if user.last_login else None,
    }


def _request_is_secure(request) -> bool:
    is_secure = getattr(request, "is_secure", None)
    if callable(is_secure):
        return bool(is_secure())
    return False


@csrf_exempt
@require_http_methods(["POST"])
async def login_client(request):
    """Authenticate a client or admin with email and password.

    Admin authentication uses the ``admin_users`` table (AdminUser model).
    Valid admin roles: Admin, SuperAdmin, Viewer.
    Client authentication uses the ``client_users`` table (ClientUser model).
    """
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

    await ensure_db_initialized()

    # ── 1. Try AdminUser table first ──────────────────────────────────────────
    admin_user = await AdminUser.filter(email=email).first()
    if admin_user is not None:
        # Validate role is one of the three permitted admin roles
        role_raw = str(admin_user.role or "").strip()
        role_canonical = _canonicalize_admin_role(role_raw)
        if role_canonical is None:
            return _error(
                f"Admin account has an invalid role '{role_raw}'. "
                "Allowed roles: Admin, SuperAdmin, Viewer.",
                status=403,
            )
        if not verify_client_password(access_code, admin_user.password_hash):
            return _error("Invalid credentials", status=401)
        if str(admin_user.status or "").strip().lower() != "active":
            return _error("Admin account is not active", status=403)

        # Record last login
        from django.utils import timezone
        admin_user.last_login = timezone.now()
        await admin_user.save(update_fields=["last_login"])

        token = create_admin_login_token(admin_user.id, admin_user.email, role_canonical)
        await create_audit_log(
            request,
            user_name=admin_user.name,
            user_email=admin_user.email,
            user_role=role_canonical,
            action_type="Login",
            module_name="Authentication",
            record_id=str(admin_user.id),
            new_values={
                "email": admin_user.email,
                "status": admin_user.status,
                "role": role_canonical,
                "event": "admin_login",
            },
            user_id=admin_user.id,
        )
        response = JsonResponse(
            {
                "status": "ok",
                "message": "Admin login successful",
                "token_type": "Bearer",
                "token": token,
                "access_token": token,
                "jwt_token": token,
                "refresh_token": token,
                "role": role_canonical,
                "admin": _serialize_admin_user(admin_user),
            }
        )
        return set_auth_cookies(
            response,
            token=token,
            user_id=admin_user.id,
            role=role_canonical,
            max_age=ADMIN_LOGIN_MAX_AGE,
            secure=_request_is_secure(request),
            legacy_cookie_name=ADMIN_LOGIN_COOKIE_NAME,
        )

    # ── 2. Fall through to ClientUser table ──────────────────────────────────
    user = await ClientUser.filter(email=email).first()
    if user is None:
        return _error("Invalid credentials", status=401)

    role_value = str(user.role or "").strip().lower()
    # Reject admin-role users stored in client_users (they should be in admin_users)
    if "admin" in role_value:
        return _error("Invalid credentials", status=401)

    password_login = bool(user.password_hash) and verify_client_password(access_code, user.password_hash)
    access_code_login = bool(user.user_code) and user.user_code == access_code
    if not password_login and not access_code_login:
        return _error("Invalid credentials", status=401)

    profile = user
    from django.utils import timezone
    user.last_login = timezone.now()
    await user.save(update_fields=["last_login"])

    token = create_client_login_token(user.id, user.email)
    await create_audit_log(
        request,
        user_name=user.name,
        user_email=user.email,
        user_role="Client",
        action_type="Login",
        module_name="Authentication",
        record_id=str(user.id),
        new_values={
            "email": user.email,
            "status": user.status,
            "role": "Client",
            "event": "client_login",
        },
        user_id=user.id,
    )

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
            "client": _serialize_client_user(user),
            "profile": _serialize_client_profile(user),
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
