"""Client payment details endpoint."""

from __future__ import annotations

import json
import logging

from backendPanel.mail_queue import queue_email_message
from django.http import JsonResponse
from django.template.loader import render_to_string
from django.utils import timezone
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

logger = logging.getLogger(__name__)


def _payment_label(payment_type: str) -> str:
    return "Bank Account" if payment_type == "bank" else "Crypto Wallet"


def _render_payment_submission_email(
    *,
    user_name: str,
    payment_type: str,
    details: dict[str, str],
    status: str = "Pending",
    created_at: str | None = None,
) -> tuple[str, str, str]:
    label = _payment_label(payment_type)
    context = {
        "title": f"{label} Submitted",
        "user_name": user_name or "there",
        "payment_label": label,
        "details": details,
        "status": status,
        "created_at": created_at or "",
    }
    subject = f"{label} submitted for approval"
    plain_body = render_to_string(
        "emails/payment_details_submission_notification_email.txt", context
    ).strip()
    html_body = render_to_string(
        "emails/payment_details_submission_notification_email.html", context
    )
    return subject, plain_body, html_body


async def _send_payment_submission_email(
    *,
    user_name: str,
    email: str,
    payment_type: str,
    details: dict[str, str],
    status: str = "Pending",
    created_at: str | None = None,
) -> None:
    subject, plain_body, html_body = _render_payment_submission_email(
        user_name=user_name,
        payment_type=payment_type,
        details=details,
        status=status,
        created_at=created_at,
    )
    await queue_email_message(
        subject=subject,
        body=plain_body,
        html_body=html_body,
        to=[email],
        source=f"client_{payment_type}_submission",
        payload={
            "user_name": user_name,
            "payment_type": payment_type,
            "status": status,
            "created_at": created_at,
        },
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

    try:
        if payment_type == "bank":
            details = {
                "Account Holder": str(submission_payload.get("account_holder") or ""),
                "Bank Name": str(submission_payload.get("bank_name") or ""),
                "Account Number": str(submission_payload.get("account_number") or ""),
                "IFSC / SWIFT": str(submission_payload.get("ifsc_swift") or ""),
                "Branch": str(submission_payload.get("branch") or ""),
                "Country": str(submission_payload.get("country") or ""),
            }
        else:
            details = {
                "Network": str(submission_payload.get("network") or ""),
                "Wallet Address": str(submission_payload.get("wallet_address") or ""),
                "Currency": str(submission_payload.get("currency") or ""),
            }

        await _send_payment_submission_email(
            user_name=str(
                getattr(profile, "full_name", None)
                or getattr(profile, "name", None)
                or profile.email
                or "Client"
            ),
            email=str(getattr(profile, "email", "") or ""),
            payment_type=payment_type,
            details=details,
            status="Pending",
            created_at=timezone.now().strftime("%Y-%m-%d %H:%M:%S"),
        )
    except Exception as exc:
        logger.error(f"Failed to send payment submission email to {profile.email}: {exc}")

    return JsonResponse(
        {
            "status": "ok",
            "message": "Payment details submitted for approval",
            "request_id": pending_request.id,
            "payment_details": payment_details,
        }
    )
