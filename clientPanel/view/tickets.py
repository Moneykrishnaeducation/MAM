"""Client support ticket endpoints."""

from __future__ import annotations

import json
import mimetypes
import uuid
from pathlib import Path

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from adminPanel.models import ClientTicket
from backendPanel.permissions import IsClient, permission_required
from clientPanel.view.common import _error, _get_client_profile_for_request


def _normalize_ticket_status(raw_status: str | None) -> str | None:
    value = str(raw_status or "").strip().lower()
    if value in {"", "all", "*"}:
        return None
    if value in {"open", "pending", "closed"}:
        return value
    return None


def _canonical_ticket_status(status: str | None) -> str:
    value = str(status or "").strip().lower()
    if value in {"open", "new", "active"}:
        return "Open"
    if value in {"pending", "in progress", "inprogress", "processing"}:
        return "Pending"
    if value in {"closed", "resolved", "completed", "done"}:
        return "Closed"
    return str(status or "Open").strip() or "Open"


def _ticket_matches_status(ticket_status: str | None, requested_status: str | None) -> bool:
    if requested_status is None:
        return True

    value = str(ticket_status or "").strip().lower()
    if requested_status == "open":
        return value in {"open", "new", "active"}
    if requested_status == "pending":
        return value in {"pending", "in progress", "inprogress", "processing"}
    return value in {"closed", "resolved", "completed", "done"}


def _public_media_path(path: str | None) -> str | None:
    if not path:
        return None
    if path.startswith("http://") or path.startswith("https://"):
        return path
    return path


def _serialize_attachments(raw_attachments: object) -> list[dict]:
    if not isinstance(raw_attachments, list):
        return []

    normalized: list[dict] = []
    for index, attachment in enumerate(raw_attachments):
        if isinstance(attachment, str):
            attachment = {
                "id": f"attachment-{index}",
                "name": Path(attachment).name or "Attachment",
                "file": attachment,
            }

        if not isinstance(attachment, dict):
            continue

        file_path = attachment.get("file") or attachment.get("file_url") or attachment.get("path")
        public_file = _public_media_path(file_path if isinstance(file_path, str) else None)
        attachment_name = attachment.get("name")
        if not isinstance(attachment_name, str) or not attachment_name.strip():
            attachment_name = Path(public_file or str(file_path or "")).name or "Attachment"

        normalized.append(
            {
                "id": str(attachment.get("id") or f"attachment-{index}"),
                "name": attachment_name,
                "file": public_file,
                "file_url": public_file,
                "content_type": attachment.get("content_type"),
                "size": attachment.get("size"),
            }
        )

    return normalized


def _serialize_ticket(ticket: ClientTicket, request=None) -> dict:
    return {
        "id": ticket.id,
        "subject": ticket.subject,
        "category": ticket.category,
        "priority": ticket.priority,
        "status": _canonical_ticket_status(ticket.status),
        "description": ticket.description,
        "created_at": ticket.created_at.strftime("%Y-%m-%d %H:%M:%S") if ticket.created_at else None,
        "attachments": _serialize_attachments(getattr(ticket, "attachments", None)),
    }


def _extract_ticket_payload(request) -> tuple[dict, list]:
    content_type = str(getattr(request, "content_type", "") or request.META.get("CONTENT_TYPE", "")).lower()
    if content_type.startswith("multipart/form-data"):
        files = (
            request.FILES.getlist("documents")
            or request.FILES.getlist("attachments")
            or request.FILES.getlist("files")
        )
        return request.POST, files

    try:
        return json.loads(request.body or b"{}"), []
    except (json.JSONDecodeError, ValueError):
        raise ValueError("Invalid JSON body")


def _save_ticket_attachment(uploaded_file, ticket_id: int) -> dict | None:
    original_name = Path(getattr(uploaded_file, "name", "") or "attachment").name
    suffix = Path(original_name).suffix.lower()
    if not suffix:
        guessed = mimetypes.guess_extension(str(getattr(uploaded_file, "content_type", "") or ""))
        suffix = guessed or ".bin"

    attachment_dir = Path(settings.MEDIA_ROOT) / "tickets" / "attachments"
    attachment_dir.mkdir(parents=True, exist_ok=True)

    filename = f"ticket-{ticket_id}-{uuid.uuid4().hex}{suffix}"
    file_path = attachment_dir / filename

    try:
        with open(file_path, "wb") as destination:
            for chunk in uploaded_file.chunks():
                destination.write(chunk)
    except Exception:
        return None

    public_path = f"{settings.MEDIA_URL.rstrip('/')}/tickets/attachments/{filename}"
    return {
        "id": uuid.uuid4().hex,
        "name": original_name,
        "file": public_path,
        "file_url": public_path,
        "content_type": getattr(uploaded_file, "content_type", None),
        "size": getattr(uploaded_file, "size", None),
    }


@permission_required(IsClient)
@require_http_methods(["GET"])
async def get_client_tickets(request):
    """Load all support tickets for the authenticated client."""
    profile, error = await _get_client_profile_for_request(request)
    if error:
        return error

    requested_status = _normalize_ticket_status(request.GET.get("status") or request.GET.get("tab"))
    tickets = (
        await ClientTicket.filter(client_profile_id=profile.id)
        .order_by("-created_at")
        .all()
    )
    filtered_tickets = [
        ticket for ticket in tickets if _ticket_matches_status(ticket.status, requested_status)
    ]
    return JsonResponse(
        {
            "status": "ok",
            "user_id": profile.user_id,
            "status_filter": requested_status or "all",
            "tickets": [_serialize_ticket(ticket, request) for ticket in filtered_tickets],
        }
    )


@csrf_exempt
@permission_required(IsClient)
@require_http_methods(["POST"])
async def create_client_ticket(request):
    """Create a support ticket for the authenticated client."""
    try:
        body, uploaded_files = _extract_ticket_payload(request)
    except ValueError:
        return _error("Invalid JSON body", status=400)

    subject = str(body.get("subject") or "").strip()
    category = str(body.get("category") or "General Question").strip()
    priority = str(body.get("priority") or "Medium").strip() or "Medium"
    description = str(body.get("description") or "").strip()

    if not subject:
        return _error("subject is required", status=400)
    if not description:
        return _error("description is required", status=400)

    profile, error = await _get_client_profile_for_request(request)
    if error:
        return error

    ticket = await ClientTicket.create(
        client_profile=profile,
        subject=subject,
        category=category,
        priority=priority,
        status="Open",
        description=description,
        attachments=[],
    )

    attachments = []
    for uploaded_file in uploaded_files:
        saved_attachment = _save_ticket_attachment(uploaded_file, ticket.id)
        if saved_attachment is not None:
            attachments.append(saved_attachment)

    if attachments:
        ticket.attachments = attachments
        await ticket.save(update_fields=["attachments"])

    return JsonResponse(
        {
            "status": "ok",
            "message": "Ticket created successfully",
            "ticket": _serialize_ticket(ticket, request),
            "user_id": profile.user_id,
        },
        status=201,
    )


@permission_required(IsClient)
@require_http_methods(["GET"])
async def get_client_ticket_detail(request, ticket_id: int):
    """Load a single ticket for the authenticated client."""
    profile, error = await _get_client_profile_for_request(request)
    if error:
        return error

    ticket = await ClientTicket.filter(id=ticket_id, client_profile_id=profile.id).first()
    if ticket is None:
        return _error("Ticket not found", status=404)

    return JsonResponse(
        {
            "status": "ok",
            "user_id": profile.user_id,
            "ticket": _serialize_ticket(ticket, request),
        }
    )
