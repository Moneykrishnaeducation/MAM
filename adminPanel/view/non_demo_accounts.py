from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from adminPanel.models import TradeGroup, TradingAccount
from adminPanel.mt5.services import MT5ManagerActions
from backendPanel.permissions import IsAdmin, permission_required


@csrf_exempt
@permission_required(IsAdmin)
@require_http_methods(["GET"])
async def non_demo_accounts_api(request):
    """
    Fetch all active trading accounts, querying MT5 to resolve live balance & group configs.
    Excludes CENT/Demo groups if necessary, or provides them for filtering.
    """
    try:
        search_q = str(request.GET.get("search") or "").strip().lower()

        accounts = await TradingAccount.filter(status="Active").prefetch_related("user").all()

        results = []
        mt5 = MT5ManagerActions()

        for acc in accounts:
            if acc.account_type not in ["MAM", "Investor"]:
                continue

            acc_id = acc.account_id or ""
            name = acc.account_name or (acc.user.name if acc.user else "Client")
            email = acc.user.email if acc.user else "N/A"

            if search_q:
                haystack = f"{name} {email} {acc_id}".lower()
                if search_q not in haystack:
                    continue

            group_name = ""
            group_alias = ""
            try:
                group_name = mt5.get_group_of(int(acc_id))
                if group_name:
                    trade_group = await TradeGroup.filter(name=group_name).first()
                    if trade_group:
                        group_alias = trade_group.alias or ""
            except Exception:
                pass

            balance = float(acc.balance or 0.0)
            try:
                account_data = mt5.get_account_data(acc_id, use_cache=True) if acc_id else None
                if account_data:
                    balance = float(account_data.get("balance", balance))
            except Exception:
                pass

            if group_name and "demo" in group_name.lower():
                continue

            results.append(
                {
                    "id": acc.id,
                    "account_id": acc_id,
                    "user_name": name,
                    "user_email": email,
                    "balance": balance,
                    "group_name": group_name,
                    "group_alias": group_alias,
                    "account_type": acc.account_type,
                }
            )

        return JsonResponse(results, safe=False)
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)
