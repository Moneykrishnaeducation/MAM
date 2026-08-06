"""Client document endpoint."""

from __future__ import annotations

import logging
import json
from pathlib import Path

from asgiref.sync import sync_to_async
from django.core.mail import EmailMultiAlternatives
from django.core.files.storage import default_storage
from django.http import JsonResponse
from django.template.loader import render_to_string
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from backendPanel.database import ensure_db_initialized
from backendPanel.permissions import IsClient, permission_required
from adminPanel.view.mail import _mail_from_address
from clientPanel.view.common import (
    _error,
    _get_client_profile_for_request,
    build_document_details_payload,
    build_document_submission_payload,
    create_document_pending_request,
    get_client_document_details,
    get_latest_document_request,
)

logger = logging.getLogger(__name__)


def _normalize_document_type(value: str | None) -> str | None:
    normalized = str(value or "").strip().lower()
    if normalized in {"identity", "address"}:
        return normalized
    return None


def _save_uploaded_document(uploaded_file, profile_id: int, document_type: str) -> tuple[str, str]:
    original_name = Path(getattr(uploaded_file, "name", "") or "document").name
    relative_path = f"client_documents/{profile_id}/{document_type}/{original_name}"
    saved_path = default_storage.save(relative_path, uploaded_file)
    file_url = default_storage.url(saved_path)
    return saved_path, file_url


def _document_label(document_type: str) -> str:
    return "Identity Proof" if document_type == "identity" else "Address Proof"


def _render_document_submission_email(
    *,
    user_name: str,
    document_type: str,
    details: dict[str, str],
    status: str = "Pending",
    created_at: str | None = None,
) -> tuple[str, str, str]:
    label = _document_label(document_type)
    context = {
        "title": f"{label} Submitted",
        "user_name": user_name or "there",
        "document_label": label,
        "details": details,
        "status": status,
        "created_at": created_at or "",
    }
    subject = f"{label} submitted for approval"
    plain_body = render_to_string("emails/document_submission_notification_email.txt", context).strip()
    html_body = render_to_string("emails/document_submission_notification_email.html", context)
    return subject, plain_body, html_body


async def _send_document_submission_email(
    *,
    user_name: str,
    email: str,
    document_type: str,
    details: dict[str, str],
    status: str = "Pending",
    created_at: str | None = None,
) -> None:
    subject, plain_body, html_body = _render_document_submission_email(
        user_name=user_name,
        document_type=document_type,
        details=details,
        status=status,
        created_at=created_at,
    )
    message = EmailMultiAlternatives(
        subject=subject,
        body=plain_body,
        from_email=_mail_from_address(),
        to=[email],
    )
    message.attach_alternative(html_body, "text/html")
    await sync_to_async(message.send, thread_sensitive=True)(fail_silently=False)


@csrf_exempt
@permission_required(IsClient)
@require_http_methods(["GET", "POST"])
async def client_documents(request):
    await ensure_db_initialized()
    profile, error = await _get_client_profile_for_request(request)
    if error:
        return error

    document_detail = await get_client_document_details(profile)
    identity_request = await get_latest_document_request(profile, "identity")
    address_request = await get_latest_document_request(profile, "address")

    if request.method == "GET":
        return JsonResponse(
            {
                "status": "ok",
                "documents": build_document_details_payload(
                    profile=profile,
                    document_detail=document_detail,
                    identity_request=identity_request,
                    address_request=address_request,
                ),
            }
        )

    document_type = _normalize_document_type(request.POST.get("documentType") or request.POST.get("document_type"))
    if document_type is None:
        try:
            body = json.loads(request.body or b"{}")
        except (json.JSONDecodeError, ValueError):
            body = {}
        document_type = _normalize_document_type(body.get("documentType") or body.get("document_type"))
        if document_type is None:
            return _error("documentType must be either 'identity' or 'address'", status=400)
    uploaded_file = (
        request.FILES.get("documentFile")
        or request.FILES.get("file")
        or request.FILES.get("document")
        or next(iter(request.FILES.values()), None)
    )
    if uploaded_file is None:
        return _error("documentFile is required", status=400)

    file_path, file_url = _save_uploaded_document(uploaded_file, profile.id, document_type)

    try:
        submission_payload = build_document_submission_payload(
            profile=profile,
            body={"documentType": document_type},
            file_name=str(getattr(uploaded_file, "name", "") or "document").strip() or "document",
            file_path=file_path,
            file_url=file_url,
            content_type=getattr(uploaded_file, "content_type", None),
            file_size=getattr(uploaded_file, "size", None),
        )
    except ValueError as exc:
        return _error(str(exc), status=400)

    pending_request = await create_document_pending_request(profile, submission_payload)

    try:
        await _send_document_submission_email(
            user_name=str(getattr(profile, "full_name", None) or getattr(profile, "name", None) or profile.email or "Client"),
            email=str(getattr(profile, "email", "") or ""),
            document_type=document_type,
            details={
                "Document Type": _document_label(document_type),
                "File Name": str(submission_payload.get("file_name") or ""),
                "File URL": str(submission_payload.get("file_url") or ""),
            },
            status="Pending",
            created_at=timezone.now().strftime("%Y-%m-%d %H:%M:%S"),
        )
    except Exception as exc:
        logger.error(f"Failed to send document submission email to {profile.email}: {exc}")

    identity_request = await get_latest_document_request(profile, "identity")
    address_request = await get_latest_document_request(profile, "address")

    return JsonResponse(
        {
            "status": "ok",
            "message": "Document submitted for approval",
            "request_id": pending_request.id,
            "documents": build_document_details_payload(
                profile=profile,
                document_detail=document_detail,
                identity_request=identity_request,
                address_request=address_request,
            ),
        }
    )
