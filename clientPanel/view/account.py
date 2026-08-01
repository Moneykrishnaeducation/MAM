"""Client trading account endpoint."""

from django.http import JsonResponse

from adminPanel.models import ClientAccount
from backendPanel.permissions import IsClient, permission_required
from clientPanel.view.common import _error, _get_client_profile_for_request


@permission_required(IsClient)
async def get_client_account(request):
    """Load trading account details for a client user directly from database."""
    profile, error = await _get_client_profile_for_request(request)
    if error:
        return error
    account = await ClientAccount.filter(client_profile_id=profile.id).first()
    if account is None:
        return _error("Account not found", status=404, account=None)
    return JsonResponse(
        {
            "status": "ok",
            "account": {
                "user_id": profile.user_id,
                "account_number": account.account_number,
                "server": account.server,
                "balance": account.balance,
                "equity": account.equity,
                "margin_free": account.margin_free,
                "leverage": account.leverage,
                "currency": account.currency,
                "status": account.status,
            },
        }
    )
