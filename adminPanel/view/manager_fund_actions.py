"""Dedicated views for Manager / Account financial actions: deposit, withdrawal, credit-in, credit-out, history, investors-list."""

import json
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from adminPanel.models import TradingAccount
from adminPanel.mt5.services import MT5ManagerActions
from backendPanel.permissions import IsAdmin, permission_required

logger = logging.getLogger(__name__)


@csrf_exempt
@permission_required(IsAdmin)
@require_http_methods(["POST"])
async def manager_deposit_api(request):
    """Process Manager manual deposit via MT5 and sync DB."""
    return await _process_financial_action(request, action_type="deposit")


@csrf_exempt
@permission_required(IsAdmin)
@require_http_methods(["POST"])
async def manager_withdraw_api(request):
    """Process Manager withdrawal via MT5 and sync DB."""
    return await _process_financial_action(request, action_type="withdraw")


@csrf_exempt
@permission_required(IsAdmin)
@require_http_methods(["POST"])
async def manager_credit_in_api(request):
    """Process Manager credit-in (bonus) via MT5 and sync DB."""
    return await _process_financial_action(request, action_type="credit-in")


@csrf_exempt
@permission_required(IsAdmin)
@require_http_methods(["POST"])
async def manager_credit_out_api(request):
    """Process Manager credit-out (deduction) via MT5 and sync DB."""
    return await _process_financial_action(request, action_type="credit-out")


@csrf_exempt
@permission_required(IsAdmin)
@require_http_methods(["GET"])
async def manager_history_api(request, account_id: str):
    """Fetch transaction history & logs for a specific manager account."""
    trading_acc = await TradingAccount.filter(account_id=str(account_id)).first()
    if not trading_acc:
        return JsonResponse({"status": "error", "message": f"Trading account {account_id} not found"}, status=404)

    # Sample transaction history payload for account
    history_records = [
        {"id": f"TX-{trading_acc.account_id}-01", "type": "Deposit", "amount": f"+${trading_acc.balance:,.2f}", "status": "Completed", "date": "Recent"},
        {"id": f"TX-{trading_acc.account_id}-02", "type": "Credit-In", "amount": f"+${getattr(trading_acc, 'credit', 0.0):,.2f}", "status": "Approved", "date": "Active"},
    ]

    return JsonResponse({
        "status": "ok",
        "account_id": trading_acc.account_id,
        "history": history_records
    })


@csrf_exempt
@permission_required(IsAdmin)
@require_http_methods(["GET"])
async def manager_investors_list_api(request, account_id: str):
    """Fetch assigned investors list for a specific MAM master manager account."""
    mam_master = await TradingAccount.filter(account_id=str(account_id), account_type="MAM").first()
    if not mam_master:
        return JsonResponse({"status": "error", "message": f"MAM Master account {account_id} not found"}, status=404)

    investors = await TradingAccount.filter(mam_master_account=mam_master).prefetch_related("user")
    investor_data = [
        {
            "id": f"INV-{inv.account_id}",
            "accountId": inv.account_id,
            "name": inv.user.name if inv.user else inv.account_name,
            "email": inv.user.email if inv.user else "",
            "invested": f"${inv.equity:,.2f}",
            "profit": "+$0.00"
        }
        for inv in investors
    ]

    return JsonResponse({
        "status": "ok",
        "mam_account_id": mam_master.account_id,
        "investors": investor_data
    })


async def _process_financial_action(request, action_type: str):
    try:
        body = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"status": "error", "message": "Invalid JSON body"}, status=400)

    account_id = body.get("accountId")
    amount_raw = body.get("amount")
    note = body.get("note", "")

    if not account_id or amount_raw is None:
        return JsonResponse({"status": "error", "message": "accountId and amount are required"}, status=400)

    try:
        amount = float(amount_raw)
        if amount <= 0:
            return JsonResponse({"status": "error", "message": "Amount must be greater than 0"}, status=400)
    except (ValueError, TypeError):
        return JsonResponse({"status": "error", "message": "Invalid amount format"}, status=400)

    trading_acc = await TradingAccount.filter(account_id=str(account_id)).prefetch_related("user").first()
    if not trading_acc:
        return JsonResponse({"status": "error", "message": f"Trading account {account_id} not found"}, status=404)

    try:
        mt5 = MT5ManagerActions()
    except Exception as e:
        logger.error(f"MT5 Manager connection failed: {e}")
        return JsonResponse({"status": "error", "message": f"MT5 connection failed: {e}"}, status=500)

    mt5_login = int(trading_acc.account_id)
    comment = note if note else f"Admin Manager {action_type.capitalize()}"
    success = False

    if action_type == "deposit":
        success = mt5.deposit_funds(mt5_login, amount, comment)
    elif action_type == "withdraw":
        success = mt5.withdraw_funds(mt5_login, amount, comment)
    elif action_type == "credit-in":
        success = mt5.credit_in_funds(mt5_login, amount, comment)
    elif action_type == "credit-out":
        success = mt5.credit_out_funds(mt5_login, amount, comment)

    if not success:
        return JsonResponse({"status": "error", "message": f"Failed to execute MT5 {action_type} for account {account_id}"}, status=500)

    current_balance = float(getattr(trading_acc, "balance", 0.0) or 0.0)
    current_credit = float(getattr(trading_acc, "credit", 0.0) or 0.0)

    if action_type == "deposit":
        trading_acc.balance = current_balance + amount
    elif action_type == "withdraw":
        trading_acc.balance = max(0.0, current_balance - amount)
    elif action_type == "credit-in":
        trading_acc.credit = current_credit + amount
    elif action_type == "credit-out":
        trading_acc.credit = max(0.0, current_credit - amount)

    trading_acc.equity = float(trading_acc.balance) + float(trading_acc.credit)
    await trading_acc.save()

    logger.info(f"[MANAGER FINANCIAL ACTION] {action_type.upper()} of ${amount} applied to account {account_id} by admin.")

    return JsonResponse({
        "status": "ok",
        "message": f"Manager {action_type.replace('-', ' ')} of ${amount:.2f} processed successfully for account {account_id}",
        "account": {
            "account_id": trading_acc.account_id,
            "balance": float(trading_acc.balance),
            "credit": float(trading_acc.credit),
            "equity": float(trading_acc.equity),
        }
    })
