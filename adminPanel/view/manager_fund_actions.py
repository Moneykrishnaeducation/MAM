"""Dedicated views for Manager / Account financial actions: deposit, withdrawal, credit-in, credit-out, history, investors-list."""

import json
import logging
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from tortoise.expressions import Q

from adminPanel.models import TradingAccount, ClientTransaction
from adminPanel.view.admin_identity import (
    normalize_approved_by,
    normalize_transaction_source,
    resolve_admin_display_name,
)
from adminPanel.mt5.services import MT5ManagerActions
from backendPanel.permissions import IsAdmin, permission_required

logger = logging.getLogger(__name__)


def _build_transaction_source(action_type: str) -> str:
    action_label = str(action_type or "").replace("-", " ").replace("_", " ").strip().title()
    return " ".join(part for part in ["Manager", action_label or "Transaction"] if part).strip()


def _format_transaction_source(transaction: ClientTransaction, default_role: str = "Manager") -> str:
    source_value = normalize_transaction_source(transaction.source)
    if source_value:
        return source_value

    role = str(transaction.role or default_role or "").strip()
    action_label = str(transaction.transaction_type or transaction.payment_method or "Transaction").strip()
    action_label = action_label.replace("-", " ").replace("_", " ").title() or "Transaction"
    return " ".join(part for part in [role, action_label] if part).strip() or "Transaction"


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
@require_http_methods(["POST"])
async def account_financial_action_api(request):
    """Process generic financial action (deposit/withdraw/credit) based on body actionType."""
    try:
        body = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"status": "error", "message": "Invalid JSON body"}, status=400)

    action_type = body.get("actionType")
    if not action_type or action_type not in ["deposit", "withdraw", "credit-in", "credit-out"]:
        return JsonResponse(
            {"status": "error", "message": "Invalid or missing actionType"}, status=400
        )

    return await _process_financial_action(request, action_type=action_type)


@csrf_exempt
@permission_required(IsAdmin)
@require_http_methods(["GET"])
async def manager_history_api(request, account_id: str):
    """Fetch real transaction history directly from DB for a specific manager account with full fields."""
    trading_acc = (
        await TradingAccount.filter(account_id=str(account_id)).prefetch_related("user").first()
    )
    if not trading_acc:
        return JsonResponse(
            {"status": "error", "message": f"Trading account {account_id} not found"}, status=404
        )

     # Filter strictly by account_number matching the requested account_id
    q_filter = Q(account_number=str(account_id))
    

    transactions = await ClientTransaction.filter(q_filter).order_by("-created_at").limit(50)
    account_label = trading_acc.account_id

    history_records = [
        {
            "id": f"TX-{tx.id}",
            "raw_id": tx.id,
			 "account_number": tx.account_number or str(account_id),
            "type": tx.transaction_type.capitalize(),
            "transaction_type": tx.transaction_type,
            "amount": f"{'-' if tx.transaction_type.lower() in ['withdraw', 'withdrawal', 'credit-out', 'deduction'] else '+'}${tx.amount:,.2f}",
            "raw_amount": tx.amount,
            "payment_method": tx.payment_method or "Manual Adjustment",
            "role": tx.role or (trading_acc.user.role if trading_acc.user else "Manager"),
            "email": tx.email or (trading_acc.user.email if trading_acc.user else "N/A"),
            "account": tx.account_number or account_label,
            "approved_by": normalize_approved_by(tx.approved_by),
            "approval_date": (
                tx.approval_date.strftime("%Y-%m-%d %H:%M")
                if tx.approval_date
                else (tx.created_at.strftime("%Y-%m-%d %H:%M") if tx.created_at else "N/A")
            ),
            "description": tx.description or tx.transaction_type.capitalize(),
            "source": _format_transaction_source(tx),
            "status": tx.status or "Completed",
            "date": tx.created_at.strftime("%b %d, %Y %H:%M") if tx.created_at else "N/A",
            "timestamp": tx.created_at.isoformat() if tx.created_at else None,
        }
        for tx in transactions
    ]

    return JsonResponse(
        {"status": "ok", "account_id": trading_acc.account_id, "history": history_records}
    )


@csrf_exempt
@permission_required(IsAdmin)
@require_http_methods(["GET"])
async def manager_investors_list_api(request, account_id: str):
    """Fetch assigned investors list for a specific MAM master manager account."""
    mam_master = await TradingAccount.filter(account_id=str(account_id), account_type="MAM").first()
    if not mam_master:
        return JsonResponse(
            {"status": "error", "message": f"MAM Master account {account_id} not found"}, status=404
        )

    investors = await TradingAccount.filter(mam_master_account=mam_master).prefetch_related("user")
    investor_data = [
        {
            "id": f"INV-{inv.account_id}",
            "accountId": inv.account_id,
            "name": inv.user.name if inv.user else inv.account_name,
            "email": inv.user.email if inv.user else "",
            "invested": f"${inv.equity:,.2f}",
            "profit": f"${(inv.equity - inv.balance):+,.2f}"
            if getattr(inv, "equity", 0) != getattr(inv, "balance", 0)
            else "+$0.00",
        }
        for inv in investors
    ]

    return JsonResponse(
        {"status": "ok", "mam_account_id": mam_master.account_id, "investors": investor_data}
    )


async def _process_financial_action(request, action_type: str):
    try:
        body = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"status": "error", "message": "Invalid JSON body"}, status=400)

    account_id = body.get("accountId")
    amount_raw = body.get("amount")
    note = body.get("note", "")

    if not account_id or amount_raw is None:
        return JsonResponse(
            {"status": "error", "message": "accountId and amount are required"}, status=400
        )

    try:
        amount = float(amount_raw)
        if amount <= 0:
            return JsonResponse(
                {"status": "error", "message": "Amount must be greater than 0"}, status=400
            )
    except (ValueError, TypeError):
        return JsonResponse({"status": "error", "message": "Invalid amount format"}, status=400)

    trading_acc = (
        await TradingAccount.filter(account_id=str(account_id)).prefetch_related("user").first()
    )
    if not trading_acc:
        return JsonResponse(
            {"status": "error", "message": f"Trading account {account_id} not found"}, status=404
        )

    try:
        mt5 = MT5ManagerActions()
    except Exception as e:
        logger.error(f"MT5 Manager connection failed: {e}")
        return JsonResponse(
            {"status": "error", "message": f"MT5 connection failed: {e}"}, status=500
        )

    mt5_login = int(trading_acc.account_id)
    comment = note if note else f"Manager {action_type.capitalize()}"
    success = False
    approved_by = await resolve_admin_display_name(request)
    approval_date = timezone.now()
    transaction_source = _build_transaction_source(action_type)

    if action_type == "deposit":
        success = mt5.deposit_funds(mt5_login, amount, comment)
    elif action_type == "withdraw":
        success = mt5.withdraw_funds(mt5_login, amount, comment)
    elif action_type == "credit-in":
        success = mt5.credit_in_funds(mt5_login, amount, comment)
    elif action_type == "credit-out":
        success = mt5.credit_out_funds(mt5_login, amount, comment)

    if not success:
        return JsonResponse(
            {
                "status": "error",
                "message": f"Failed to execute MT5 {action_type} for account {account_id}",
            },
            status=500,
        )

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

    # Log real transaction to transactions table
    user_obj = trading_acc.user if trading_acc.user else None
    user_email = user_obj.email if user_obj else None
    user_role = user_obj.role if user_obj else "Manager"

    await ClientTransaction.create(
        user=user_obj,
        account_number=str(trading_acc.account_id),
        transaction_type=action_type.capitalize(),
        amount=amount,
        payment_method="Manual Adjustment",
        role=user_role,
        email=user_email,
        approved_by=approved_by,
        approval_date=approval_date,
        description=comment,
        source=transaction_source,
        status="Completed",
    )

    logger.info(
        f"[MANAGER FINANCIAL ACTION] {action_type.upper()} of ${amount} applied to account {account_id} by admin."
    )

    return JsonResponse(
        {
            "status": "ok",
            "message": f"Manager {action_type.replace('-', ' ')} of ${amount:.2f} processed successfully for account {account_id}",
            "account": {
                "account_id": trading_acc.account_id,
                "balance": float(trading_acc.balance),
                "credit": float(trading_acc.credit),
                "equity": float(trading_acc.equity),
            },
        }
    )
