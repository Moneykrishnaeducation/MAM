"""Admin endpoint for viewing a client's support tickets."""

from __future__ import annotations

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from adminPanel.models import ClientTicket, ClientUser
from backendPanel.permissions import IsAdmin, permission_required


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


def _normalize_ticket_status(raw_status: str | None) -> str | None:
    value = str(raw_status or "").strip().lower()
    if value in {"", "all", "*"}:
        return None
    if value in {"open", "pending", "closed"}:
        return value
    return None


def _normalize_ticket_category(raw_category: str | None) -> str | None:
    value = str(raw_category or "").strip().lower()
    if value in {"", "all", "*"}:
        return None
    return value


def _canonical_ticket_status(status: str | None) -> str:
    value = str(status or "").strip().lower()
    if value in {"open", "new", "active"}:
        return "Open"
    if value in {"pending", "in progress", "inprogress", "processing"}:
        return "Pending"
    if value in {"closed", "resolved", "completed", "done"}:
        return "Closed"
    return str(status or "Open").strip() or "Open"


def _ticket_matches_filters(
    ticket: ClientTicket,
    status_filter: str | None,
    category_filter: str | None,
) -> bool:
    if status_filter is not None:
        normalized_status = str(ticket.status or "").strip().lower()
        if status_filter == "open":
            if normalized_status not in {"open", "new", "active"}:
                return False
        elif status_filter == "pending":
            if normalized_status not in {"pending", "in progress", "inprogress", "processing"}:
                return False
        elif normalized_status not in {"closed", "resolved", "completed", "done"}:
            return False

    if category_filter is not None:
        if str(ticket.category or "").strip().lower() != category_filter:
            return False

    return True


def _serialize_ticket(ticket: ClientTicket) -> dict:
    return {
        "id": ticket.id,
        "subject": ticket.subject,
        "category": ticket.category,
        "priority": ticket.priority,
        "status": _canonical_ticket_status(ticket.status),
        "description": ticket.description,
        "date": ticket.created_at.strftime("%Y-%m-%d %H:%M:%S") if ticket.created_at else None,
    }


@permission_required(IsAdmin)
@require_http_methods(["GET"])
async def list_client_tickets(request, user_id: str):
    """Return a client's support ticket history for the admin users page."""

    user = await _resolve_client_user(user_id)
    if user is None:
        return JsonResponse({"status": "error", "message": "Client user not found"}, status=404)

    status_filter = _normalize_ticket_status(request.GET.get("status") or request.GET.get("tab"))
    category_filter = _normalize_ticket_category(request.GET.get("category") or request.GET.get("type"))

    tickets = (
        await ClientTicket.filter(client_profile__user_id=user.id)
        .order_by("-created_at", "-id")
        .all()
    )
    filtered_tickets = [
        ticket
        for ticket in tickets
        if _ticket_matches_filters(ticket, status_filter, category_filter)
    ]

    summary = {
        "total_tickets": len(tickets),
        "open_count": sum(
            1 for ticket in tickets if str(ticket.status or "").strip().lower() in {"open", "new", "active"}
        ),
        "pending_count": sum(
            1
            for ticket in tickets
            if str(ticket.status or "").strip().lower() in {"pending", "in progress", "inprogress", "processing"}
        ),
        "closed_count": sum(
            1
            for ticket in tickets
            if str(ticket.status or "").strip().lower() in {"closed", "resolved", "completed", "done"}
        ),
    }

    return JsonResponse(
        {
            "status": "ok",
            "user": {
                "id": user.user_code or f"USR-{user.id:03d}",
                "name": user.name,
                "email": user.email,
            },
            "status_filter": status_filter or "all",
            "category_filter": category_filter or "all",
            "summary": summary,
            "tickets": [_serialize_ticket(ticket) for ticket in filtered_tickets],
        }
    )
