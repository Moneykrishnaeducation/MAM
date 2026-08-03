"""Client support ticket endpoints."""

import json

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


def _serialize_ticket(ticket: ClientTicket) -> dict:
    return {
        "id": ticket.id,
        "subject": ticket.subject,
        "category": ticket.category,
        "priority": ticket.priority,
        "status": _canonical_ticket_status(ticket.status),
        "description": ticket.description,
        "created_at": ticket.created_at.strftime("%Y-%m-%d %H:%M:%S") if ticket.created_at else None,
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
            "tickets": [_serialize_ticket(ticket) for ticket in filtered_tickets],
        }
    )


@csrf_exempt
@permission_required(IsClient)
@require_http_methods(["POST"])
async def create_client_ticket(request):
    """Create a support ticket for the authenticated client."""
    try:
        body = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, ValueError):
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
    )

    return JsonResponse(
        {
            "status": "ok",
            "message": "Ticket created successfully",
            "ticket": _serialize_ticket(ticket),
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
            "ticket": _serialize_ticket(ticket),
        }
    )
