"""Client profile endpoint."""

from __future__ import annotations

import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

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


@csrf_exempt
@permission_required(IsClient)
@require_http_methods(["GET", "PUT"])
async def get_client_profile(request):
    """Load or submit the authenticated client's profile data."""
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

    pending_request = await create_profile_pending_request(user, user, submission_payload)

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
