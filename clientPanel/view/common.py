"""Shared helpers for clientPanel view modules."""

import base64
import hashlib
import hmac
import json
import os
import time

from django.http import JsonResponse

from adminPanel.models import ClientProfile

CLIENT_LOGIN_KEY = "client-panel-login-key"
CLIENT_LOGIN_COOKIE_NAME = "client_auth_token"
AUTH_ACCESS_COOKIE_NAME = "access_token"
AUTH_JWT_COOKIE_NAME = "jwt_token"
AUTH_REFRESH_COOKIE_NAME = "refresh_token"
AUTH_ROLE_COOKIE_NAME = "role"
AUTH_USER_ID_COOKIE_NAME = "user_id"
CLIENT_LOGIN_MAX_AGE = 60 * 60 * 24 * 7
CLIENT_PASSWORD_HASH_ITERATIONS = 120000
ADMIN_LOGIN_KEY = "admin-panel-login-key"
ADMIN_LOGIN_COOKIE_NAME = "admin_auth_token"
ADMIN_LOGIN_MAX_AGE = 60 * 60 * 24 * 7


def _error(message: str, status: int = 400, **extra):
    payload = {"status": "error", "message": message}
    payload.update(extra)
    return JsonResponse(payload, status=status)


def _serialize_client_profile(profile: ClientProfile) -> dict:
    return {
        "user_id": profile.user_id,
        "full_name": profile.full_name,
        "email": profile.email,
        "phone": profile.phone,
        "country": profile.country,
        "dateOfBirth": profile.date_of_birth,
        "address": profile.address,
        "city": profile.city,
        "postalCode": profile.postal_code,
        "tier": profile.tier,
        "kyc_status": profile.kyc_status,
    }


def _extract_bearer_token(request) -> str | None:
    authorization = request.headers.get("Authorization") or request.headers.get("authorization")
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        return None
    return token.strip()


def _get_first_cookie(request, cookie_names: tuple[str, ...]) -> str | None:
    cookies = getattr(request, "COOKIES", {})
    for cookie_name in cookie_names:
        token = cookies.get(cookie_name)
        if token:
            return token
    return None


def get_client_request_token(request) -> str | None:
    """Read the client session token from the HttpOnly cookie or Authorization header."""
    token = _get_first_cookie(
        request,
        (
            CLIENT_LOGIN_COOKIE_NAME,
            AUTH_ACCESS_COOKIE_NAME,
            AUTH_JWT_COOKIE_NAME,
            AUTH_REFRESH_COOKIE_NAME,
        ),
    )
    if token:
        return token
    return _extract_bearer_token(request)


def get_admin_request_token(request) -> str | None:
    """Read the admin session token from the HttpOnly cookie or Authorization header."""
    token = _get_first_cookie(
        request,
        (
            ADMIN_LOGIN_COOKIE_NAME,
            AUTH_ACCESS_COOKIE_NAME,
            AUTH_JWT_COOKIE_NAME,
            AUTH_REFRESH_COOKIE_NAME,
        ),
    )
    if token:
        return token
    return _extract_bearer_token(request)


def set_auth_cookies(
    response,
    *,
    token: str,
    user_id: int,
    role: str,
    max_age: int,
    secure: bool,
    legacy_cookie_name: str,
):
    """Persist auth token and role in browser cookies."""
    cookie_options = {
        "max_age": max_age,
        "secure": secure,
        "samesite": "Lax",
        "path": "/",
    }
    http_only_options = {**cookie_options, "httponly": True}

    response.set_cookie(legacy_cookie_name, token, **http_only_options)
    response.set_cookie(AUTH_ACCESS_COOKIE_NAME, token, **http_only_options)
    response.set_cookie(AUTH_JWT_COOKIE_NAME, token, **http_only_options)
    response.set_cookie(AUTH_REFRESH_COOKIE_NAME, token, **http_only_options)
    response.set_cookie(AUTH_USER_ID_COOKIE_NAME, str(user_id), **cookie_options)
    response.set_cookie(AUTH_ROLE_COOKIE_NAME, role, **cookie_options)
    return response


async def _resolve_client_user_id(request) -> int | None:
    token = get_client_request_token(request)
    if token:
        payload = load_client_login_token(token)
        if payload is None:
            return None
        user_id = payload.get("user_id")
        return int(user_id) if user_id is not None else None


async def _get_client_profile_for_request(request):
    user_id = await _resolve_client_user_id(request)
    if user_id is None:
        return None, _error("Authenticated session cookie is required", status=400)

    profile = await ClientProfile.filter(user_id=user_id).first()
    if profile is None:
        return None, _error("Profile not found", status=404)
    return profile, None


def create_client_login_token(user_id: int, email: str) -> str:
    """Create a short-lived signed token for a client session."""
    return _create_signed_login_token(
        key=CLIENT_LOGIN_KEY,
        payload={
            "user_id": user_id,
            "email": email,
            "ts": int(time.time()),
        },
    )


def create_admin_login_token(user_id: int, email: str, role: str) -> str:
    """Create a short-lived signed token for an admin session."""
    return _create_signed_login_token(
        key=ADMIN_LOGIN_KEY,
        payload={
            "user_id": user_id,
            "email": email,
            "role": role,
            "ts": int(time.time()),
        },
    )


def _create_signed_login_token(*, key: str, payload: dict) -> str:
    payload_json = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(payload_json).rstrip(b"=").decode("ascii")
    signature = hmac.new(
        key.encode("utf-8"),
        payload_b64.encode("ascii"),
        hashlib.sha256,
    ).hexdigest()
    return f"{payload_b64}.{signature}"


def hash_client_password(password: str) -> str:
    """Hash a client password using PBKDF2."""
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        CLIENT_PASSWORD_HASH_ITERATIONS,
    )
    return (
        "pbkdf2_sha256$"
        f"{CLIENT_PASSWORD_HASH_ITERATIONS}$"
        f"{base64.urlsafe_b64encode(salt).decode('ascii').rstrip('=')}$"
        f"{base64.urlsafe_b64encode(digest).decode('ascii').rstrip('=')}"
    )


def verify_client_password(password: str, encoded: str | None) -> bool:
    """Verify a password against a stored PBKDF2 hash."""
    if not encoded:
        return False

    try:
        algorithm, iterations_raw, salt_b64, hash_b64 = encoded.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        iterations = int(iterations_raw)
        salt_padding = "=" * (-len(salt_b64) % 4)
        hash_padding = "=" * (-len(hash_b64) % 4)
        salt = base64.urlsafe_b64decode(f"{salt_b64}{salt_padding}".encode("ascii"))
        stored_hash = base64.urlsafe_b64decode(f"{hash_b64}{hash_padding}".encode("ascii"))
    except (ValueError, TypeError, UnicodeDecodeError):
        return False

    computed_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        iterations,
    )
    return hmac.compare_digest(stored_hash, computed_hash)


def load_client_login_token(token: str) -> dict | None:
    """Validate a client login token and return its payload if valid."""
    return _load_signed_login_token(token=token, key=CLIENT_LOGIN_KEY)


def load_admin_login_token(token: str) -> dict | None:
    """Validate an admin login token and return its payload if valid."""
    return _load_signed_login_token(token=token, key=ADMIN_LOGIN_KEY)


def _load_signed_login_token(token: str, key: str) -> dict | None:
    try:
        payload_b64, signature = token.split(".", 1)
    except ValueError:
        return None

    expected_signature = hmac.new(
        key.encode("utf-8"),
        payload_b64.encode("ascii"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(signature, expected_signature):
        return None

    padding = "=" * (-len(payload_b64) % 4)
    try:
        payload_json = base64.urlsafe_b64decode(f"{payload_b64}{padding}".encode("ascii"))
        payload = json.loads(payload_json.decode("utf-8"))
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError):
        return None

    issued_at = payload.get("ts")
    if not isinstance(issued_at, int):
        return None
    if int(time.time()) - issued_at > CLIENT_LOGIN_MAX_AGE:
        return None

    user_id = payload.get("user_id")
    if user_id is None:
        return None
    try:
        payload["user_id"] = int(user_id)
    except (TypeError, ValueError):
        return None
    return payload
