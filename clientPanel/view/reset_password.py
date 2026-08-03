"""Client password reset endpoint."""

import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from adminPanel.models import ClientUser
from clientPanel.view.common import _error, hash_client_password


@csrf_exempt
@require_http_methods(["POST"])
async def reset_client_password(request):
    """Reset a client password using the client's email address."""
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
