"""Client payment details endpoint."""

from __future__ import annotations

import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from backendPanel.database import ensure_db_initialized
from backendPanel.permissions import IsClient, permission_required
from clientPanel.view.common import (
    build_payment_submission_payload,
    build_payment_details_payload,
    create_payment_pending_request,
    get_latest_payment_request_status,
    get_client_payment_details,
    _error,
    _get_client_profile_for_request,
)


@csrf_exempt
@permission_required(IsClient)
@require_http_methods(["GET", "PUT"])
async def client_payment_details(request):
    """Load or update the authenticated client's payment details."""
    await ensure_db_initialized()
    profile, error = await _get_client_profile_for_request(request)
    if error:
        return error

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
        return JsonResponse(
            {
                "status": "ok",
                "payment_details": payment_details,
            }
        )

    try:
        body = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, ValueError):
        return _error("Invalid JSON body", status=400)

    payment_type = str(body.get("paymentType") or body.get("payment_type") or "").strip().lower()
    if payment_type not in {"bank", "crypto"}:
        return _error("paymentType must be either 'bank' or 'crypto'", status=400)

    submission_payload = build_payment_submission_payload(
        profile=profile,
        payment_type=payment_type,
        body=body,
        bank_detail=bank_detail,
        crypto_detail=crypto_detail,
    )
    pending_request = await create_payment_pending_request(profile, submission_payload)

    return JsonResponse(
        {
            "status": "ok",
            "message": "Payment details submitted for approval",
            "request_id": pending_request.id,
            "payment_details": payment_details,
        }
    )
