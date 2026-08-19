"""Client profile endpoint."""

from __future__ import annotations

import json
import logging

from backendPanel.mail_queue import queue_email_message
from django.http import JsonResponse
from django.template.loader import render_to_string
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from adminPanel.view.mail import _frontend_base_url
from backendPanel.database import ensure_db_initialized
from backendPanel.permissions import IsClient, permission_required
from clientPanel.view.common import (
    _error,
    _get_client_profile_for_request,
    _serialize_client_profile,
    build_profile_submission_payload,
    build_payment_details_payload,
    create_profile_pending_request,
    get_client_payment_details,
    get_latest_profile_request_status,
    get_latest_payment_request_status,
)
from django.core.files.storage import default_storage
from pathlib import Path

logger = logging.getLogger(__name__)


def _profile_display_name(profile) -> str:
    return str(
        getattr(profile, "full_name", None)
        or getattr(profile, "name", None)
        or getattr(profile, "email", None)
        or "Client"
    )


def _render_profile_update_email(
    *,
    user_name: str,
    details: dict,
    status: str = "Pending",
    created_at: str | None = None,
) -> tuple[str, str, str]:
    context = {
        "user_name": user_name or "there",
        "details": details,
        "status": status,
        "created_at": created_at or "",
        "frontend_base_url": _frontend_base_url(),
    }
    subject = "Profile details submitted for approval"
    plain_body = render_to_string("emails/profile_update_notification_email.txt", context).strip()
    html_body = render_to_string("emails/profile_update_notification_email.html", context)
    return subject, plain_body, html_body


async def _send_profile_update_email(
    *,
    user_name: str,
    email: str,
    details: dict,
    status: str = "Pending",
    created_at: str | None = None,
) -> None:
    subject, plain_body, html_body = _render_profile_update_email(
        user_name=user_name,
        details=details,
        status=status,
        created_at=created_at,
    )
    await queue_email_message(
        subject=subject,
        body=plain_body,
        html_body=html_body,
        to=[email],
        source="client_profile_submission",
        payload={"user_name": user_name, "status": status, "created_at": created_at},
    )


@csrf_exempt
@permission_required(IsClient)
@require_http_methods(["GET", "PUT"])
async def get_client_profile(request):
    """Load or submit the authenticated client's profile data."""
    await ensure_db_initialized()
    profile, error = await _get_client_profile_for_request(request)
    if error:
        return error

    profile_request_status = await get_latest_profile_request_status(profile)
    bank_detail, crypto_detail = await get_client_payment_details(profile)
    bank_request_status = await get_latest_payment_request_status(profile, "bank")
    crypto_request_status = await get_latest_payment_request_status(profile, "crypto")

    payment_details = build_payment_details_payload(
        profile=profile,
        bank_detail=bank_detail,
        crypto_detail=crypto_detail,
    )
    if bank_request_status is not None:
        payment_details["bank"]["status"] = bank_request_status
    if crypto_request_status is not None:
        payment_details["crypto"]["status"] = crypto_request_status

    if request.method == "GET":
        payload = {
            "status": "ok",
            "profile": _serialize_client_profile(profile),
            "payment_details": payment_details,
        }
        if profile_request_status is not None:
            payload["profile_request_status"] = profile_request_status
        return JsonResponse(payload)

    try:
        body = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, ValueError):
        return _error("Invalid JSON body", status=400)

    user = profile

    try:
        submission_payload = build_profile_submission_payload(body=body, user=user, profile=profile)
    except ValueError as exc:
        return _error(str(exc), status=400)

    # Immediately update the profile so auto-verification has data to compare against
    if "full_name" in submission_payload and submission_payload["full_name"]:
        profile.full_name = submission_payload["full_name"]
    if "phone" in submission_payload and submission_payload["phone"]:
        profile.phone = submission_payload["phone"]
    if "country" in submission_payload and submission_payload["country"]:
        profile.country = submission_payload["country"]
    if "date_of_birth" in submission_payload and submission_payload["date_of_birth"]:
        profile.date_of_birth = submission_payload["date_of_birth"]
    if "address" in submission_payload and submission_payload["address"]:
        profile.address = submission_payload["address"]
    if "city" in submission_payload and submission_payload["city"]:
        profile.city = submission_payload["city"]
    if "postal_code" in submission_payload and submission_payload["postal_code"]:
        profile.postal_code = submission_payload["postal_code"]
    
    await profile.save(update_fields=["full_name", "phone", "country", "date_of_birth", "address", "city", "postal_code"])

    pending_request = await create_profile_pending_request(user, user, submission_payload)

    try:
        await _send_profile_update_email(
            user_name=_profile_display_name(profile),
            email=str(getattr(profile, "email", "") or ""),
            details={
                "Full Name": submission_payload.get("full_name") or "",
                "Phone": submission_payload.get("phone") or "",
                "Country": submission_payload.get("country") or "",
                "City": submission_payload.get("city") or "",
                "Postal Code": submission_payload.get("postal_code") or "",
                "Tier": submission_payload.get("tier") or "",
                "KYC Status": submission_payload.get("kyc_status") or "",
            },
            status="Pending",
            created_at=timezone.now().strftime("%Y-%m-%d %H:%M:%S"),
        )
    except Exception as exc:
        logger.error(f"Failed to send profile update email to {profile.email}: {exc}")

    return JsonResponse(
        {
            "status": "ok",
            "message": "Profile details submitted for approval",
            "request_id": pending_request.id,
            "profile": _serialize_client_profile(profile),
            "payment_details": payment_details,
            "profile_request_status": "pending",
        }
    )


@csrf_exempt
@permission_required(IsClient)
@require_http_methods(["POST"])
async def upload_client_avatar(request):
    """Upload client profile picture / avatar."""
    await ensure_db_initialized()
    profile, error = await _get_client_profile_for_request(request)
    if error:
        return error

    uploaded_file = (
        request.FILES.get("avatarFile")
        or request.FILES.get("avatar")
        or request.FILES.get("file")
        or next(iter(request.FILES.values()), None)
    )
    if uploaded_file is None:
        return _error("avatarFile is required", status=400)

    original_name = Path(getattr(uploaded_file, "name", "") or "avatar.png").name
    relative_path = f"client_avatars/{profile.id}/{original_name}"

    saved_path = default_storage.save(relative_path, uploaded_file)
    file_url = default_storage.url(saved_path)

    profile.avatar = file_url
    await profile.save(update_fields=["avatar"])

    return JsonResponse(
        {
            "status": "ok",
            "message": "Profile uploaded successfully",
            "avatar": file_url,
        }
    )
