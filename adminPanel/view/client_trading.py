"""Admin endpoint for viewing a client's trading accounts."""

from __future__ import annotations

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from adminPanel.models import ClientUser, TradingAccount
from backendPanel.permissions import IsAdmin, permission_required

async def _resolve_client_user(user_id: str) -> ClientUser | None:
    lookup = str(user_id).strip()
    if not lookup:
        return None

    user = await ClientUser.filter(user_code=lookup).first()
    if not user and lookup.isdigit():
        user = await ClientUser.filter(id=int(lookup)).first()

    return user

@csrf_exempt
@require_http_methods(["GET"])
@permission_required(IsAdmin)
async def get_client_trading_details(request, user_id: str):
    """
    Returns the trading accounts for a specific client user.
    """
    try:
        user = await _resolve_client_user(user_id)
        if not user:
            return JsonResponse({"status": "error", "message": "User not found."}, status=404)

        trading_accounts = await TradingAccount.filter(user_id=user.id).all()

        trading_accounts_data = []
        for account in trading_accounts:
            role = "manager" if account.account_type == "MAM" else "investor"
            trading_accounts_data.append({
                "accNumber": account.account_id,
                "accountRole": role,
                "type": account.account_type,
                "balance": f"${account.balance:,.2f}" if account.balance else "$0.00",
                "equity": f"${account.equity:,.2f}" if account.equity else "$0.00",
                "leverage": f"1:{account.leverage}",
                "server": "MT5 Server",
                "currency": "USD",
                "marginFree": f"${account.margin_free:,.2f}" if account.margin_free else "$0.00",
                "activeTrades": 0,
                "status": "Active" if account.is_enabled else "Inactive",
                "id": account.id
            })

        return JsonResponse({
            "status": "success",
            "trading_accounts": trading_accounts_data
        })

    except Exception as e:
        return JsonResponse({
            "status": "error",
            "message": str(e)
        }, status=500)
