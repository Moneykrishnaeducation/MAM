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
        "attachments": ticket.attachments or [],
        "messages": ticket.messages or [],
    }


@permission_required(IsAdmin)
@require_http_methods(["GET"])
async def list_client_tickets(request, user_id: str):
    """Return a client's support ticket history for the admin users page."""

    user = await _resolve_client_user(user_id)
    if user is None:
        return JsonResponse({"status": "error", "message": "Client user not found"}, status=404)

    status_filter = _normalize_ticket_status(request.GET.get("status") or request.GET.get("tab"))
    category_filter = _normalize_ticket_category(
        request.GET.get("category") or request.GET.get("type")
    )

    tickets = await ClientTicket.filter(user_id=user.id).order_by("-created_at", "-id").all()
    filtered_tickets = [
        ticket
        for ticket in tickets
        if _ticket_matches_filters(ticket, status_filter, category_filter)
    ]

    summary = {
        "total_tickets": len(tickets),
        "open_count": sum(
            1
            for ticket in tickets
            if str(ticket.status or "").strip().lower() in {"open", "new", "active"}
        ),
        "pending_count": sum(
            1
            for ticket in tickets
            if str(ticket.status or "").strip().lower()
            in {"pending", "in progress", "inprogress", "processing"}
        ),
        "closed_count": sum(
            1
            for ticket in tickets
            if str(ticket.status or "").strip().lower()
            in {"closed", "resolved", "completed", "done"}
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

def _serialize_ticket_with_user(ticket: ClientTicket) -> dict:
    user = getattr(ticket, "user", None)
    user_code = getattr(user, "user_code", None) or (f"USR-{user.id:03d}" if user else "N/A")
    user_name = getattr(user, "name", None) or "Unknown Client"
    user_email = getattr(user, "email", None) or "N/A"
    return {
        "id": ticket.id,
        "subject": ticket.subject,
        "category": ticket.category,
        "priority": ticket.priority,
        "status": _canonical_ticket_status(ticket.status),
        "description": ticket.description,
        "date": ticket.created_at.strftime("%Y-%m-%d %H:%M:%S") if ticket.created_at else None,
        "attachments": getattr(ticket, "attachments", []) or [],
        "messages": getattr(ticket, "messages", []) or [],
        "user_id": str(user.user_code) if user and hasattr(user, "user_code") else str(user.id) if user else "",
    }


@permission_required(IsAdmin)
@require_http_methods(["GET"])
async def list_all_tickets(request):
    """Return all client support tickets with user info for the admin tickets page."""
    status_filter = _normalize_ticket_status(request.GET.get("status") or request.GET.get("tab"))
    category_filter = _normalize_ticket_category(
        request.GET.get("category") or request.GET.get("type")
    )
    search = str(request.GET.get("search") or "").strip().lower()

    try:
        page = max(1, int(request.GET.get("page", 1)))
    except (ValueError, TypeError):
        page = 1

    try:
        per_page = max(1, min(100, int(request.GET.get("per_page") or request.GET.get("perPage") or 10)))
    except (ValueError, TypeError):
        per_page = 10

    tickets = await ClientTicket.all().prefetch_related("user").order_by("-created_at", "-id")

    filtered_tickets = []
    for ticket in tickets:
        if not _ticket_matches_filters(ticket, status_filter, category_filter):
            continue

        if search:
            user_name = str(getattr(ticket.user, "name", "") or "").lower()
            user_email = str(getattr(ticket.user, "email", "") or "").lower()
            subject = str(ticket.subject or "").lower()
            ticket_id = str(ticket.id)
            if not (
                search in user_name
                or search in user_email
                or search in subject
                or search in ticket_id
            ):
                continue

        filtered_tickets.append(ticket)

    total_filtered = len(filtered_tickets)
    total_pages = max(1, (total_filtered + per_page - 1) // per_page)
    page = min(page, total_pages)
    start = (page - 1) * per_page
    end = start + per_page
    paginated_tickets = filtered_tickets[start:end]

    summary = {
        "total_tickets": len(tickets),
        "open_count": sum(
            1
            for ticket in tickets
            if str(ticket.status or "").strip().lower() in {"open", "new", "active"}
        ),
        "pending_count": sum(
            1
            for ticket in tickets
            if str(ticket.status or "").strip().lower()
            in {"pending", "in progress", "inprogress", "processing"}
        ),
        "closed_count": sum(
            1
            for ticket in tickets
            if str(ticket.status or "").strip().lower()
            in {"closed", "resolved", "completed", "done"}
        ),
    }

    return JsonResponse(
        {
            "status": "ok",
            "summary": summary,
            "page": page,
            "per_page": per_page,
            "total": total_filtered,
            "total_pages": total_pages,
            "tickets": [_serialize_ticket_with_user(ticket) for ticket in paginated_tickets],
        }
    )


@permission_required(IsAdmin)
@require_http_methods(["POST", "PUT"])
async def update_ticket_status(request, ticket_id: int):
    """Update a client support ticket status (e.g. Open, Pending, Closed)."""
    import json

    ticket = await ClientTicket.filter(id=ticket_id).prefetch_related("user").first()
    if not ticket:
        return JsonResponse({"status": "error", "message": "Ticket not found"}, status=404)

    try:
        data = json.loads(request.body.decode("utf-8")) if request.body else {}
    except Exception:
        data = {}

    new_status = data.get("status") or request.POST.get("status")
    if not new_status:
        return JsonResponse({"status": "error", "message": "Status is required"}, status=400)

    canonical = _canonical_ticket_status(new_status)
    ticket.status = canonical
    await ticket.save()

    return JsonResponse(
        {
            "status": "ok",
            "message": f"Ticket #{ticket.id} status updated to {canonical}.",
            "ticket": _serialize_ticket_with_user(ticket),
        }
    )


@permission_required(IsAdmin)
@require_http_methods(["POST"])
async def add_admin_ticket_message(request, ticket_id: int):
    """Add a message to a client support ticket from the admin side."""
    import time
    from clientPanel.view.tickets import _extract_ticket_payload, _save_ticket_attachment
    from datetime import datetime

    ticket = await ClientTicket.filter(id=ticket_id).prefetch_related("user").first()
    if not ticket:
        return JsonResponse({"status": "error", "message": "Ticket not found"}, status=404)

    try:
        body, uploaded_files = _extract_ticket_payload(request)
    except ValueError:
        return JsonResponse({"status": "error", "message": "Invalid request body"}, status=400)

    content = str(body.get("content") or "").strip()
    if not content and not uploaded_files:
        return JsonResponse({"status": "error", "message": "Message content or document is required"}, status=400)

    file_attachment = None
    if uploaded_files:
        saved = _save_ticket_attachment(uploaded_files[0], ticket.id)
        if saved and "file" in saved:
            file_attachment = saved["file"]

    admin_name = getattr(request, "admin_user_name", "Admin")

    new_message = {
        "id": f"msg-{int(time.time() * 1000)}",
        "content": content,
        "sender_name": admin_name,
        "sender": "admin",
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    
    if file_attachment:
        new_message["file"] = file_attachment

    messages = list(getattr(ticket, "messages", []) or [])
    messages.append(new_message)
    ticket.messages = messages
    
    await ticket.save(update_fields=["messages"])

    return JsonResponse(
        {
            "status": "ok",
            "message": "Message sent successfully",
            "ticket": _serialize_ticket_with_user(ticket),
            "new_message": new_message,
        }
    )

