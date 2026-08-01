"""Client transactions endpoint."""

from django.http import JsonResponse

from adminPanel.models import ClientTransaction
from backendPanel.permissions import IsClient, permission_required
from clientPanel.view.common import _get_client_profile_for_request


@permission_required(IsClient)
async def get_client_transactions(request):
    """Load transactions for a client user directly from database."""
    profile, error = await _get_client_profile_for_request(request)
    if error:
        return error
    transactions = await ClientTransaction.filter(client_profile_id=profile.id).all()
    results = [
        {
            "id": tx.id,
            "type": tx.transaction_type,
            "amount": tx.amount,
            "method": tx.payment_method,
            "status": tx.status,
            "date": tx.created_at.strftime("%Y-%m-%d") if tx.created_at else None,
        }
        for tx in transactions
    ]
    return JsonResponse({"status": "ok", "user_id": profile.user_id, "transactions": results})
