"""Admin endpoint for updating a client profile from the users page."""

from __future__ import annotations

import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from adminPanel.models import ClientUser
from backendPanel.permissions import IsAdmin, permission_required
from clientPanel.view.common import (
    _serialize_client_profile,
    build_profile_submission_payload,
)


def _serialize_admin_client_user(user: ClientUser) -> dict:
    return {
        "id": user.user_code or f"USR-{user.id:03d}",
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "status": user.status,
        "verified": user.verified,
        "country": user.country,
        "joined": user.joined.strftime("%Y-%m-%d") if user.joined else None,
        "avatar": user.avatar,
        "profile": _serialize_client_profile(user),
    }


async def _resolve_client_user(user_id: str) -> ClientUser | None:
    lookup = str(user_id).strip()
    if not lookup:
        return None

    user = await ClientUser.filter(user_code=lookup).first()
    if user is not None:
        return user

    if lookup.upper().startswith("USR-"):
        suffix = lookup.split("-", 1)[1]
        if suffix.isdigit():
            return await ClientUser.filter(id=int(suffix)).first()

    if lookup.isdigit():
        return await ClientUser.filter(id=int(lookup)).first()

    return None


@csrf_exempt
@permission_required(IsAdmin)
@require_http_methods(["GET"])
async def get_client_profile_details(request, user_id: str):
    """Load the admin users-page client profile modal payload."""

    user = await _resolve_client_user(user_id)
    if user is None:
        return JsonResponse({"status": "error", "message": "Client user not found"}, status=404)

    return JsonResponse(
        {
            "status": "ok",
            "profile": _serialize_client_profile(user),
        }
    )


@csrf_exempt
@permission_required(IsAdmin)
@require_http_methods(["GET", "PUT"])
async def update_client_profile(request, user_id: str):
    """Update the admin users-page client profile modal payload directly."""

    user = await _resolve_client_user(user_id)
    if user is None:
        return JsonResponse({"status": "error", "message": "Client user not found"}, status=404)

    if request.method == "GET":
        return JsonResponse(
            {
                "status": "ok",
                "profile": _serialize_client_profile(user),
            }
        )

    try:
        body = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"status": "error", "message": "Invalid JSON body"}, status=400)

    email = str(body.get("email") or user.email).strip().lower()
    if email and email != user.email.lower():
        return JsonResponse(
            {"status": "error", "message": "Client email cannot be changed"},
            status=400,
        )
    try:
        submission_payload = build_profile_submission_payload(body=body, user=user, profile=user)
    except ValueError as exc:
        return JsonResponse({"status": "error", "message": str(exc)}, status=400)

    user.name = submission_payload["full_name"]
    user.full_name = submission_payload["full_name"]
    user.phone = submission_payload.get("phone")
    user.country = submission_payload["country"]
    user.date_of_birth = submission_payload.get("date_of_birth")
    user.address = submission_payload.get("address")
    user.city = submission_payload.get("city")
    user.postal_code = submission_payload.get("postal_code")
    user.tier = submission_payload["tier"]
    user.kyc_status = submission_payload["kyc_status"]
    user.avatar = submission_payload.get("avatar")
    await user.save()

    return JsonResponse(
        {
            "status": "ok",
            "message": "Client profile updated successfully",
            "user": _serialize_admin_client_user(user),
            "profile": _serialize_client_profile(user),
        }
    )
