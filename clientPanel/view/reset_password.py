"""Client password reset endpoint."""

import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from adminPanel.models import ClientUser
from backendPanel.database import ensure_db_initialized
from clientPanel.view.common import (
    _error,
    _get_client_profile_for_request,
    hash_client_password,
    verify_client_password,
)


@csrf_exempt
@require_http_methods(["POST"])
async def reset_client_password(request):
    """Reset a client password using the client's email address."""
    await ensure_db_initialized()
    try:
        body = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, ValueError):
        return _error("Invalid JSON body", status=400)

    email = str(body.get("email", "")).strip().lower()
    new_password = str(body.get("new_password") or body.get("password") or "").strip()
    confirm_password = str(body.get("confirm_password") or body.get("confirmPassword") or "").strip()

    if not email:
        return _error("email is required", status=400)
    if not new_password:
        return _error("new_password is required", status=400)
    if len(new_password) < 8:
        return _error("new_password must be at least 8 characters long", status=400)
    if new_password != confirm_password:
        return _error("confirm_password does not match new_password", status=400)

    user = await ClientUser.filter(email=email).first()
    if user is None:
        return _error("Client not found", status=404)
    if str(user.role or "").strip().lower() == "admin":
        return _error("Client not found", status=404)

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
