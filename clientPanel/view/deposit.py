"""Client deposit endpoint."""

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
async def create_client_deposit(request):
    """Create a deposit request for the authenticated client."""
    await ensure_db_initialized()

    # Determine if request is multipart or json
    is_multipart = request.content_type.startswith("multipart/form-data") or bool(request.POST)

    if is_multipart:
        amount_raw = request.POST.get("amount")
        payment_method = str(request.POST.get("payment_method") or "").strip()
        account_number = str(request.POST.get("account_number") or "").strip()
        notes = str(request.POST.get("notes") or request.POST.get("message") or "").strip()
        proof_file = (
            request.FILES.get("proof_file")
            or request.FILES.get("file")
            or request.FILES.get("proof")
        )
        proof_name = getattr(proof_file, "name", "") if proof_file else ""
    else:
        try:
            body = json.loads(request.body or b"{}")
        except (json.JSONDecodeError, ValueError):
            return _error("Invalid JSON body", status=400)

        amount_raw = body.get("amount")
        payment_method = str(body.get("payment_method") or "").strip()
        account_number = str(body.get("account_number") or "").strip()
        proof_name = str(body.get("proof_name") or body.get("proofFileName") or "").strip()
        notes = str(body.get("notes") or body.get("message") or "").strip()
        proof_file = None

    try:
        amount = float(amount_raw)
    except (TypeError, ValueError):
        return _error("amount must be a valid number", status=400)

    if amount <= 0:
        return _error("amount must be greater than zero", status=400)
    if not account_number:
        return _error("account_number is required", status=400)

    profile, error = await _get_client_profile_for_request(request)
    if error:
        return error

    proof_url = None
    if proof_file:
        from pathlib import Path

        from django.core.files.storage import default_storage

        original_name = Path(getattr(proof_file, "name", "") or "deposit_proof").name
        relative_path = f"client_deposits/{profile.id}/{original_name}"
        saved_path = default_storage.save(relative_path, proof_file)
        proof_url = default_storage.url(saved_path)
        proof_name = original_name

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
        transaction_type="Deposit",
        amount=amount,
        payment_method=payment_method,
        proof_name=proof_name or None,
        proof_url=proof_url or None,
        status="Pending",
    )

    from adminPanel.models import PendingRequest

    await PendingRequest.create(
        request_type="deposit",
        client_name=profile.full_name or profile.email or "Client",
        user_id=profile.id,
        amount=amount,
        status="Pending",
        payload={
            "transaction_id": transaction.id,
            "account_number": account.account_number,
            "amount": amount,
            "payment_method": payment_method,
            "proof_name": proof_name,
            "proof_url": proof_url,
            "notes": notes,
        },
    )

    return JsonResponse(
        {
            "status": "ok",
            "message": "Deposit request submitted successfully",
            "deposit": {
                "id": transaction.id,
                "user_id": profile.id,
                "account_number": account.account_number,
                "amount": transaction.amount,
                "payment_method": transaction.payment_method,
                "status": transaction.status,
                "proof_name": proof_name or None,
                "proof_url": proof_url or None,
                "notes": notes or None,
                "created_at": transaction.created_at.strftime("%Y-%m-%d %H:%M:%S")
                if transaction.created_at
                else None,
            },
        },
        status=201,
    )
