"""Client support tickets endpoint."""

from django.http import JsonResponse

from adminPanel.models import ClientTicket
from clientPanel.view.common import _get_client_profile_for_request


async def get_client_tickets(request):
    """Load support tickets for a client user directly from database."""
    profile, error = await _get_client_profile_for_request(request)
    if error:
        return error
    tickets = await ClientTicket.filter(client_profile_id=profile.id).all()
    results = [
        {
            "id": t.id,
            "subject": t.subject,
            "priority": t.priority,
            "status": t.status,
            "date": t.created_at.strftime("%Y-%m-%d") if t.created_at else None,
        }
        for t in tickets
    ]
    return JsonResponse({"status": "ok", "user_id": profile.user_id, "tickets": results})
