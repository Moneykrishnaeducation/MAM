"""Admin endpoint for updating a client profile from the users page."""

from __future__ import annotations

import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from adminPanel.models import ClientProfile, ClientUser
from backendPanel.permissions import IsAdmin, permission_required
from clientPanel.view.common import (
    _serialize_client_profile,
    build_profile_submission_payload,
    create_profile_pending_request,
)


def _serialize_admin_client_user(user: ClientUser, profile: ClientProfile | None = None) -> dict:
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
        "profile": _serialize_client_profile(profile) if profile else None,
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
@require_http_methods(["PUT"])
async def update_client_profile(request, user_id: str):
    """Submit the admin users-page client profile modal payload for approval."""

    user = await _resolve_client_user(user_id)
    if user is None:
        return JsonResponse({"status": "error", "message": "Client user not found"}, status=404)

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
    profile = await ClientProfile.filter(user_id=user.id).first()
    if profile is None:
        profile = await ClientProfile.create(
            user_id=user.id,
            full_name=user.name,
            email=user.email,
            phone=user.phone,
            country=user.country,
        )

    try:
        submission_payload = build_profile_submission_payload(body=body, user=user, profile=profile)
    except ValueError as exc:
        return JsonResponse({"status": "error", "message": str(exc)}, status=400)

    pending_request = await create_profile_pending_request(profile, user, submission_payload)

    return JsonResponse(
        {
            "status": "ok",
            "message": "Client profile submitted for approval",
            "request_id": pending_request.id,
            "user": _serialize_admin_client_user(user, profile),
            "profile": _serialize_client_profile(profile),
        }
    )
