import json
import logging
from decimal import Decimal

from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from tortoise.transactions import in_transaction

from adminPanel.audit import create_audit_log
from adminPanel.models import ClientTransaction, TradeGroup, TradingAccount
from adminPanel.mt5.services import MT5ManagerActions
from backendPanel.permissions import IsAdmin, permission_required

logger = logging.getLogger(__name__)


def is_cent_group(mt5_group: str) -> bool:
    if not mt5_group:
        return False
    if "cent" in mt5_group.lower() or "-c-" in mt5_group.lower():
        return True
    return False


@csrf_exempt
@permission_required(IsAdmin)
@require_http_methods(["GET", "POST"])
async def internal_transfer_api(request):
    """
    Handle internal transfers between two trading accounts.
    GET: List internal transfer transactions.
    POST: Process a new internal transfer.
    """
    if request.method == "GET":
        try:
            txs = (
                await ClientTransaction.filter(transaction_type="internal_transfer")
                .order_by("-created_at")
                .limit(200)
                .prefetch_related("user")
            )

            records = []
            for tx in txs:
                records.append(
                    {
                        "id": tx.id,
                        "fromAccountId": tx.account_id_from,
                        "toAccountId": tx.account_id_to,
                        "amount": tx.amount,
                        "description": tx.description,
                        "status": tx.status,
                        "created_at": tx.created_at.isoformat() if tx.created_at else None,
                        "approved_by": tx.approved_by,
                    }
                )
            return JsonResponse(records, safe=False)
        except Exception as e:
            logger.exception("Error listing internal transfers")
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

    elif request.method == "POST":
        try:
            body = json.loads(request.body or b"{}")
        except (json.JSONDecodeError, ValueError):
            return JsonResponse({"status": "error", "message": "Invalid JSON body"}, status=400)

        from_account_id = body.get("fromAccountId")
        to_account_id = body.get("toAccountId")
        amount_raw = body.get("amount")
        comment = body.get("comment", "")

        if not from_account_id or not to_account_id or amount_raw is None:
            return JsonResponse(
                {
                    "status": "error",
                    "message": "fromAccountId, toAccountId and amount are required",
                },
                status=400,
            )

        if str(from_account_id) == str(to_account_id):
            return JsonResponse(
                {"status": "error", "message": "From and To accounts must be different"}, status=400
            )

        try:
            amount = float(amount_raw)
            if amount <= 0:
                return JsonResponse(
                    {"status": "error", "message": "Amount must be greater than 0"}, status=400
                )
        except (ValueError, TypeError):
            return JsonResponse({"status": "error", "message": "Invalid amount format"}, status=400)

        from_account = (
            await TradingAccount.filter(account_id=str(from_account_id))
            .prefetch_related("user")
            .first()
        )
        to_account = (
            await TradingAccount.filter(account_id=str(to_account_id))
            .prefetch_related("user")
            .first()
        )

        if not from_account or not to_account:
            return JsonResponse(
                {"status": "error", "message": "One or both accounts not found"}, status=404
            )

        if from_account.account_type not in ["MAM", "Investor"] or to_account.account_type not in [
            "MAM",
            "Investor",
        ]:
            return JsonResponse(
                {
                    "status": "error",
                    "message": "Only MAM and Investor accounts are allowed for internal transfers",
                },
                status=400,
            )

        if float(from_account.balance) < amount:
            return JsonResponse(
                {"status": "error", "message": "Insufficient balance in the from account"},
                status=400,
            )

        try:
            mt5action = MT5ManagerActions()

            from_mt5_group = mt5action.get_group_of(int(from_account_id))
            to_mt5_group = mt5action.get_group_of(int(to_account_id))

            if (from_mt5_group and "demo" in from_mt5_group.lower()) or (
                to_mt5_group and "demo" in to_mt5_group.lower()
            ):
                return JsonResponse(
                    {
                        "status": "error",
                        "message": "Demo accounts are excluded from internal transfers",
                    },
                    status=400,
                )

            from_is_cent = is_cent_group(from_mt5_group)
            to_is_cent = is_cent_group(to_mt5_group)

            if not from_is_cent and from_mt5_group:
                trade_group = await TradeGroup.filter(name=from_mt5_group).first()
                if trade_group and trade_group.alias and trade_group.alias.upper() == "CENT":
                    from_is_cent = True
            if not to_is_cent and to_mt5_group:
                trade_group = await TradeGroup.filter(name=to_mt5_group).first()
                if trade_group and trade_group.alias and trade_group.alias.upper() == "CENT":
                    to_is_cent = True

            actual_withdraw_amount = amount
            actual_deposit_amount = amount

            if from_is_cent and not to_is_cent:
                actual_withdraw_amount = amount
                actual_deposit_amount = amount / 100.0
                if not mt5action.withdraw_funds(
                    int(from_account_id),
                    actual_withdraw_amount,
                    f"Internal transfer to {to_account_id}",
                ):
                    return JsonResponse(
                        {
                            "status": "error",
                            "message": "MT5 Error - Could not withdraw from CENT account",
                        },
                        status=500,
                    )
                if not mt5action.deposit_funds(
                    int(to_account_id),
                    actual_deposit_amount,
                    f"Internal transfer from {from_account_id}",
                ):
                    mt5action.deposit_funds(
                        int(from_account_id),
                        actual_withdraw_amount,
                        f"Rollback transfer to {to_account_id}",
                    )
                    return JsonResponse(
                        {
                            "status": "error",
                            "message": "MT5 Error - Could not deposit to Regular account",
                        },
                        status=500,
                    )
                mt5_success = True
            elif not from_is_cent and to_is_cent:
                actual_withdraw_amount = amount
                actual_deposit_amount = amount * 100.0
                if not mt5action.withdraw_funds(
                    int(from_account_id),
                    actual_withdraw_amount,
                    f"Internal transfer to {to_account_id}",
                ):
                    return JsonResponse(
                        {
                            "status": "error",
                            "message": "MT5 Error - Could not withdraw from Regular account",
                        },
                        status=500,
                    )
                if not mt5action.deposit_funds(
                    int(to_account_id),
                    actual_deposit_amount,
                    f"Internal transfer from {from_account_id}",
                ):
                    mt5action.deposit_funds(
                        int(from_account_id),
                        actual_withdraw_amount,
                        f"Rollback transfer to {to_account_id}",
                    )
                    return JsonResponse(
                        {
                            "status": "error",
                            "message": "MT5 Error - Could not deposit to CENT account",
                        },
                        status=500,
                    )
                mt5_success = True
            else:
                mt5_success = mt5action.internal_transfer(
                    int(to_account_id), int(from_account_id), amount, comment
                )

            if mt5_success:
                admin_username = "Admin"
                if hasattr(request, "user") and request.user:
                    admin_username = getattr(
                        request.user, "email", getattr(request.user, "username", "Admin")
                    )

                async with in_transaction():
                    transaction = await ClientTransaction.create(
                        user=from_account.user,
                        account_number=str(from_account_id),
                        transaction_type="internal_transfer",
                        amount=amount,
                        payment_method="Internal Transfer",
                        description=comment,
                        status="approved",
                        approved_by=admin_username,
                        approval_date=timezone.now(),
                        account_id_from=str(from_account_id),
                        account_id_to=str(to_account_id),
                        source="Admin Internal Transfer",
                    )

                    from_account.balance = Decimal(str(from_account.balance)) - Decimal(
                        str(actual_withdraw_amount)
                    )
                    to_account.balance = Decimal(str(to_account.balance)) + Decimal(
                        str(actual_deposit_amount)
                    )
                    await from_account.save()
                    await to_account.save()

                await create_audit_log(
                    request=request,
                    user_email=admin_username,
                    user_name=admin_username,
                    user_role="Admin",
                    action_type="internal_transfer",
                    module_name="Internal Transfer",
                    record_id=transaction.id,
                    new_values={
                        "from_account": from_account_id,
                        "to_account": to_account_id,
                        "amount": amount,
                        "from_balance": float(from_account.balance),
                        "to_balance": float(to_account.balance),
                    },
                )

                return JsonResponse(
                    {
                        "status": "ok",
                        "message": "Internal transfer successful!",
                        "transaction_id": transaction.id,
                        "from_account_balance": float(from_account.balance),
                        "to_account_balance": float(to_account.balance),
                    },
                    status=201,
                )
            else:
                return JsonResponse(
                    {"status": "error", "message": "MT5 Error - Internal Transfer failed"},
                    status=500,
                )

        except Exception as e:
            logger.exception("Error processing internal transfer")
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
