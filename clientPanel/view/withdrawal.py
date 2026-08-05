"""Client withdrawal endpoint."""

import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from adminPanel.models import ClientAccount, ClientTransaction, TradingAccount
from backendPanel.database import ensure_db_initialized
from backendPanel.permissions import IsClient, permission_required
from clientPanel.view.common import _error, _get_client_profile_for_request


@csrf_exempt
@permission_required(IsClient)
@require_http_methods(["POST"])
async def create_client_withdrawal(request):
    """Create a withdrawal request for the authenticated client."""
    await ensure_db_initialized()
    try:
        body = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, ValueError):
        return _error("Invalid JSON body", status=400)

    amount_raw = body.get("amount")
    payment_method = str(body.get("payment_method") or "Bank Transfer").strip()
    account_number = str(body.get("account_number") or "").strip()
    destination_type = str(body.get("destination_type") or "").strip()
    notes = str(body.get("notes") or body.get("message") or "").strip()

    try:
        amount = float(amount_raw)
    except (TypeError, ValueError):
        return _error("amount must be a valid number", status=400)

    if amount <= 0:
        return _error("amount must be greater than zero", status=400)
    if amount < 10:
        return _error("minimum withdrawal amount is 10", status=400)
    if not account_number:
        return _error("account_number is required", status=400)

    profile, error = await _get_client_profile_for_request(request)
    if error:
        return error

    account = await ClientAccount.filter(
        user_id=profile.id,
        account_number=account_number,
    ).first()
    if account is None:
        trading_acc = await TradingAccount.filter(
            user_id=profile.id,
            account_id=account_number,
        ).first()
        if trading_acc is None:
            return _error("Account not found for this client", status=404)

        account = await ClientAccount.create(
            user_id=profile.id,
            account_number=trading_acc.account_id,
            balance=float(trading_acc.balance),
            equity=float(trading_acc.equity),
            margin_free=float(trading_acc.margin_free),
            leverage=f"1:{trading_acc.leverage}",
            currency="USD",
            status=trading_acc.status or "Active",
        )

    transaction = await ClientTransaction.create(
        user_id=profile.id,
        account_number=account.account_number,
        transaction_type="Withdrawal",
        amount=amount,
        payment_method=payment_method,
        status="Pending",
     )

    from adminPanel.models import PendingRequest
    await PendingRequest.create(
        request_type="withdrawal",
        client_name=profile.full_name or profile.email or "Client",
        user_id=profile.id,
        amount=amount,
        status="Pending",
        payload={
            "transaction_id": transaction.id,
            "account_number": account.account_number,
            "amount": amount,
            "payment_method": payment_method,
            "destination_type": destination_type,
            "notes": notes,
        },
    )

    return JsonResponse(
        {
            "status": "ok",
            "message": "Withdrawal request submitted successfully",
            "withdrawal": {
                "id": transaction.id,
                "user_id": profile.id,
                "account_number": account.account_number,
                "amount": transaction.amount,
                "payment_method": transaction.payment_method,
                "destination_type": destination_type or None,
                "status": transaction.status,
                "notes": notes or None,
                "created_at": transaction.created_at.strftime("%Y-%m-%d %H:%M:%S") if transaction.created_at else None,
            },
        },
        status=201,
    )
