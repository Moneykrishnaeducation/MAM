"""Client profile endpoint."""

from django.http import JsonResponse

from backendPanel.permissions import IsClient, permission_required
from clientPanel.view.common import (
    _get_client_profile_for_request,
    _serialize_client_profile,
    build_payment_details_payload,
    get_client_payment_details,
    get_latest_payment_request_status,
)


@permission_required(IsClient)
async def get_client_profile(request):
    """Load profile for a client user directly from database."""
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

    return JsonResponse(
        {
            "status": "ok",
            "profile": _serialize_client_profile(profile),
            "payment_details": payment_details,
        }
    )
