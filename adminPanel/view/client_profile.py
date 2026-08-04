"""Admin endpoint for updating a client profile from the users page."""

from __future__ import annotations

import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from adminPanel.models import ClientProfile, ClientUser
from backendPanel.permissions import IsAdmin, permission_required
from clientPanel.view.common import _serialize_client_profile


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
    """Update the admin users-page client profile modal payload."""

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

    full_name = str(body.get("name") or user.name).strip()
    phone = str(body.get("phone") or user.phone or "").strip() or None
    country = str(body.get("country") or user.country).strip()
    date_of_birth = str(body.get("dateOfBirth") or "").strip() or None
    address = str(body.get("address") or "").strip() or None
    city = str(body.get("city") or "").strip() or None
    postal_code = str(body.get("postalCode") or "").strip() or None
    tier = str(body.get("tier") or "VIP Premium").strip()
    kyc_status = str(body.get("kycStatus") or "Verified").strip()
    avatar = str(body.get("avatar") or user.avatar or "").strip() or None

    profile = await ClientProfile.filter(user_id=user.id).first()
    if profile is None:
        profile = await ClientProfile.create(
            user_id=user.id,
            full_name=full_name,
            email=user.email,
            phone=phone,
            country=country,
            date_of_birth=date_of_birth,
            address=address,
            city=city,
            postal_code=postal_code,
            tier=tier,
            kyc_status=kyc_status,
        )
    else:
        profile.full_name = full_name
        profile.email = user.email
        profile.phone = phone
        profile.country = country
        profile.date_of_birth = date_of_birth
        profile.address = address
        profile.city = city
        profile.postal_code = postal_code
        profile.tier = tier
        profile.kyc_status = kyc_status
        await profile.save()

    user.name = full_name
    user.phone = phone
    user.country = country
    user.avatar = avatar
    await user.save()

    return JsonResponse(
        {
            "status": "ok",
            "message": "Client profile updated successfully",
            "user": _serialize_admin_client_user(user, profile),
            "profile": _serialize_client_profile(profile),
        }
    )
