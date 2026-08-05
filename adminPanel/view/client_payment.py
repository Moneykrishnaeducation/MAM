"""Admin endpoint for updating client payment details."""

from __future__ import annotations

import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from adminPanel.models import ClientUser
from backendPanel.permissions import IsAdmin, permission_required
from clientPanel.view.common import (
    build_payment_submission_payload,
    build_payment_details_payload,
    get_client_payment_details,
    upsert_client_bank_detail,
    upsert_client_crypto_detail,
)
from adminPanel.view.client_profile import _resolve_client_user


@csrf_exempt
@permission_required(IsAdmin)
@require_http_methods(["GET", "PUT"])
async def update_client_payment_details(request, user_id: str):
    """Load or update a client's bank/crypto payment details."""

    user = await _resolve_client_user(user_id)
    if user is None:
        return JsonResponse({"status": "error", "message": "Client user not found"}, status=404)

    bank_detail, crypto_detail = await get_client_payment_details(user)

    if request.method == "GET":
        return JsonResponse(
            {
                "status": "ok",
                "user": {
                    "id": user.user_code or f"USR-{user.id:03d}",
                    "name": user.name,
                },
                "payment_details": build_payment_details_payload(
                    profile=user,
                    bank_detail=bank_detail,
                    crypto_detail=crypto_detail,
                ),
            }
        )

    try:
        body = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"status": "error", "message": "Invalid JSON body"}, status=400)

    payment_type = str(body.get("paymentType") or body.get("payment_type") or "").strip().lower()
    if payment_type not in {"bank", "crypto"}:
        return JsonResponse({"status": "error", "message": "paymentType must be either 'bank' or 'crypto'"}, status=400)

    submission_payload = build_payment_submission_payload(
        profile=user,
        payment_type=payment_type,
        body=body,
        bank_detail=bank_detail,
        crypto_detail=crypto_detail,
    )

    if payment_type == "bank":
        await upsert_client_bank_detail(user, submission_payload)
    else:
        await upsert_client_crypto_detail(user, submission_payload)

    bank_detail, crypto_detail = await get_client_payment_details(user)

    return JsonResponse(
        {
            "status": "ok",
            "message": "Client payment details updated successfully",
            "payment_details": build_payment_details_payload(
                profile=user,
                bank_detail=bank_detail,
                crypto_detail=crypto_detail,
            ),
        }
    )
