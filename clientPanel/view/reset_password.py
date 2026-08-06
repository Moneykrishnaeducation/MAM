"""Client password reset endpoints."""

import json
from urllib.parse import urlencode

from django.core import signing
from django.http import JsonResponse
from django.utils.html import escape
from django.utils.safestring import mark_safe
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from adminPanel.models import AdminUser, ClientUser
from backendPanel.database import ensure_db_initialized
from backendPanel.mail_queue import queue_email_message
from clientPanel.view.common import (
    _error,
    _get_client_profile_for_request,
    hash_client_password,
    verify_client_password,
)

PASSWORD_RESET_TOKEN_SALT = "user-password-reset"
PASSWORD_RESET_TOKEN_MAX_AGE = 60 * 60

PASSWORD_RESET_ROLE_CHOICES = (
    ("admin", "Admin"),
    ("client", "Client"),
)


def _password_reset_page_url(request, token: str) -> str:
    reset_path = "/client/reset-password"
    query = urlencode({"token": token})
    return request.build_absolute_uri(f"{reset_path}?{query}")


def _build_password_reset_token(*, user_type: str, user) -> str:
    return signing.dumps(
        {
            "purpose": "password_reset",
            "user_type": user_type,
            "user_id": user.id,
            "email": user.email,
            "password_hash": user.password_hash or "",
        },
        salt=PASSWORD_RESET_TOKEN_SALT,
    )


def _read_password_reset_token(token: str) -> dict | None:
    try:
        payload = signing.loads(token, salt=PASSWORD_RESET_TOKEN_SALT, max_age=PASSWORD_RESET_TOKEN_MAX_AGE)
    except signing.BadSignature:
        return None

    if not isinstance(payload, dict):
        return None
    if payload.get("purpose") != "password_reset":
        return None
    return payload


async def _send_password_reset_email(user, reset_url: str, *, user_type: str) -> None:
    recipient_name = str(user.name or user.email or "there").strip()
    subject = "Reset your password"
    plain_body = (
        f"Hello {recipient_name},\n\n"
        "We received a request to reset your password.\n"
        "Use the reset button in this email to continue.\n\n"
        f"This link will expire in {PASSWORD_RESET_TOKEN_MAX_AGE // 60} minutes.\n"
        "If you did not request this, you can safely ignore this email."
    )
    html_body = mark_safe(
        "<div style=\"font-family:Arial,sans-serif;line-height:1.6;color:#0f172a\">"
        f"<h2 style=\"margin:0 0 16px\">Reset your password</h2>"
        f"<p>Hello {escape(recipient_name)},</p>"
        "<p>We received a request to reset your password.</p>"
        f"<p><a href=\"{escape(reset_url)}\" "
        "style=\"display:inline-block;background:#1d4ed8;color:#fff;padding:12px 18px;"
        "text-decoration:none;border-radius:8px\">Reset password</a></p>"
        f"<p style=\"color:#475569\">This link expires in {PASSWORD_RESET_TOKEN_MAX_AGE // 60} minutes.</p>"
        "<p style=\"color:#475569\">If you did not request this, you can ignore this email.</p>"
        "</div>"
    )

    await queue_email_message(
        subject=subject,
        body=plain_body,
        html_body=str(html_body),
        to=[user.email],
        source=f"{user_type}_password_reset",
        payload={"user_type": user_type, "email": user.email, "reset_url": reset_url},
    )


async def _find_password_reset_target_by_token(token: str) -> tuple[str, ClientUser | AdminUser] | None:
    payload = _read_password_reset_token(token)
    if payload is None:
        return None

    user_type = str(payload.get("user_type") or "").strip().lower()
    user_id = payload.get("user_id")
    email = str(payload.get("email") or "").strip().lower()

    if user_type == "admin":
        user = await AdminUser.filter(id=user_id, email=email).first()
    elif user_type == "client":
        user = await ClientUser.filter(id=user_id, email=email).first()
    else:
        return None

    if user is None:
        return None
    if (user.password_hash or "") != str(payload.get("password_hash") or ""):
        return None
    if user_type == "client" and str(user.role or "").strip().lower() == "admin":
        return None
    return user_type, user


async def _find_password_reset_target_by_email(email: str) -> tuple[str, ClientUser | AdminUser] | None:
    admin_user = await AdminUser.filter(email=email).first()
    if admin_user is not None:
        return "admin", admin_user

    client_user = await ClientUser.filter(email=email).first()
    if client_user is None:
        return None
    if str(client_user.role or "").strip().lower() == "admin":
        return None
    return "client", client_user


async def _list_password_reset_targets(email: str) -> dict[str, ClientUser | AdminUser]:
    matches: dict[str, ClientUser | AdminUser] = {}

    admin_user = await AdminUser.filter(email=email).first()
    if admin_user is not None:
        matches["admin"] = admin_user

    client_user = await ClientUser.filter(email=email).first()
    if client_user is not None and str(client_user.role or "").strip().lower() != "admin":
        matches["client"] = client_user

    return matches


@csrf_exempt
@require_http_methods(["POST"])
async def request_client_password_reset(request):
    """Send a password reset email with a time-limited reset link."""
    await ensure_db_initialized()
    try:
        body = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, ValueError):
        return _error("Invalid JSON body", status=400)

    email = str(body.get("email", "")).strip().lower()
    requested_user_type = str(body.get("user_type") or body.get("role") or "").strip().lower()
    if not email:
        return _error("email is required", status=400)

    matches = await _list_password_reset_targets(email)
    if not matches:
        return JsonResponse(
            {
                "status": "ok",
                "message": "If an account exists for that email, a reset link has been sent.",
            }
        )

    if requested_user_type and requested_user_type not in matches:
        return _error("Selected role does not match this email", status=404)

    if len(matches) > 1 and not requested_user_type:
        return JsonResponse(
            {
                "status": "needs_role_selection",
                "message": "We found both an admin and a client account with this email. Please choose which one you want to reset.",
                "roles": [
                    {"value": value, "label": label}
                    for value, label in PASSWORD_RESET_ROLE_CHOICES
                    if value in matches
                ],
                "email": email,
            }
        )

    user_type = requested_user_type or next(iter(matches.keys()))
    user = matches[user_type]
    token = _build_password_reset_token(user_type=user_type, user=user)
    reset_url = _password_reset_page_url(request, token)

    try:
        await _send_password_reset_email(user, reset_url, user_type=user_type)
    except Exception:
        return _error("Unable to send password reset email", status=502)

    return JsonResponse(
        {
            "status": "ok",
            "message": "If an account exists for that email, a reset link has been sent.",
        }
    )


@csrf_exempt
@require_http_methods(["POST"])
async def reset_client_password(request):
    """Reset a client password using a reset token or, for legacy callers, an email address."""
    await ensure_db_initialized()
    try:
        body = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, ValueError):
        return _error("Invalid JSON body", status=400)

    token = str(body.get("token") or body.get("reset_token") or "").strip()
    email = str(body.get("email", "")).strip().lower()
    requested_user_type = str(body.get("user_type") or body.get("role") or "").strip().lower()
    new_password = str(body.get("new_password") or body.get("password") or "").strip()
    confirm_password = str(body.get("confirm_password") or body.get("confirmPassword") or "").strip()

    if not token and not email:
        return _error("token or email is required", status=400)
    if not new_password:
        return _error("new_password is required", status=400)
    if len(new_password) < 8:
        return _error("new_password must be at least 8 characters long", status=400)
    if new_password != confirm_password:
        return _error("confirm_password does not match new_password", status=400)

    user = None
    if token:
        target = await _find_password_reset_target_by_token(token)
        if target is None:
            return _error("Invalid or expired reset link", status=400)
        _, user = target
    else:
        matches = await _list_password_reset_targets(email)
        if not matches:
            return _error("User not found", status=404)
        if requested_user_type and requested_user_type not in matches:
            return _error("Selected role does not match this email", status=404)
        if len(matches) > 1 and not requested_user_type:
            return _error("Role is required when the email exists in both admin and client tables", status=400)
        user = matches[requested_user_type or next(iter(matches.keys()))]

    user.password_hash = hash_client_password(new_password)
    await user.save(update_fields=["password_hash", "updated_at"])

    return JsonResponse(
        {
            "status": "ok",
            "message": "Password reset successfully",
            "email": user.email,
        }
    )


@csrf_exempt
@require_http_methods(["POST"])
async def change_client_password(request):
    """Change the authenticated client's password using the current password."""
    await ensure_db_initialized()
    try:
        body = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, ValueError):
        return _error("Invalid JSON body", status=400)

    profile, error = await _get_client_profile_for_request(request)
    if error:
        return error

    current_password = str(body.get("current_password") or body.get("currentPassword") or "").strip()
    new_password = str(body.get("new_password") or body.get("newPassword") or body.get("password") or "").strip()
    confirm_password = str(body.get("confirm_password") or body.get("confirmPassword") or "").strip()

    if not current_password:
        return _error("current_password is required", status=400)
    if not new_password:
        return _error("new_password is required", status=400)
    if len(new_password) < 8:
        return _error("new_password must be at least 8 characters long", status=400)
    if new_password != confirm_password:
        return _error("confirm_password does not match new_password", status=400)

    user = profile
    if str(user.role or "").strip().lower() == "admin":
        return _error("Client not found", status=404)

    current_password_login = bool(user.user_code) and current_password == str(user.user_code).strip()
    current_password_password = bool(user.password_hash) and verify_client_password(current_password, user.password_hash)

    if not current_password_login and not current_password_password:
        return _error("Current password is incorrect", status=400)

    user.password_hash = hash_client_password(new_password)
    await user.save(update_fields=["password_hash", "updated_at"])

    return JsonResponse(
        {
            "status": "ok",
            "message": "Password updated successfully",
            "email": user.email,
        }
    )
