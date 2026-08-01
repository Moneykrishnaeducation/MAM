"""Client investments endpoint."""

from django.http import JsonResponse

from adminPanel.models import MyInvestment
from clientPanel.view.common import _get_client_profile_for_request


async def get_client_investments(request):
    """Load allocated investments for a client user directly from database."""
    profile, error = await _get_client_profile_for_request(request)
    if error:
        return error
    investments = await MyInvestment.filter(client_profile_id=profile.id).all()
    results = [
        {
            "id": inv.id,
            "strategy": inv.strategy_name,
            "manager": inv.manager_name,
            "allocated": inv.allocated_amount,
            "current_value": inv.current_value,
            "return_pct": inv.return_pct,
            "status": inv.status,
        }
        for inv in investments
    ]
    return JsonResponse({"status": "ok", "user_id": profile.user_id, "investments": results})
