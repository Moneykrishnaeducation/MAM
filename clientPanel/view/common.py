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
CLIENT_LOGIN_MAX_AGE = 60 * 60 * 24 * 7
CLIENT_PASSWORD_HASH_ITERATIONS = 120000


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


async def _resolve_client_user_id(request) -> int | None:
    token = _extract_bearer_token(request)
    if token:
        payload = load_client_login_token(token)
        if payload is None:
            return None
        user_id = payload.get("user_id")
        return int(user_id) if user_id is not None else None

    raw_user_id = request.GET.get("user_id")
    if not raw_user_id:
        return None
    try:
        return int(raw_user_id)
    except ValueError:
        return None


async def _get_client_profile_for_request(request):
    user_id = await _resolve_client_user_id(request)
    if user_id is None:
        return None, _error("user_id query parameter or Bearer token is required", status=400)

    profile = await ClientProfile.filter(user_id=user_id).first()
    if profile is None:
        return None, _error("Profile not found", status=404)
    return profile, None


def create_client_login_token(user_id: int, email: str) -> str:
    """Create a short-lived signed token for a client session."""
    payload = {
        "user_id": user_id,
        "email": email,
        "ts": int(time.time()),
    }
    payload_json = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(payload_json).rstrip(b"=").decode("ascii")
    signature = hmac.new(
        CLIENT_LOGIN_KEY.encode("utf-8"),
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
    try:
        payload_b64, signature = token.split(".", 1)
    except ValueError:
        return None

    expected_signature = hmac.new(
        CLIENT_LOGIN_KEY.encode("utf-8"),
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
