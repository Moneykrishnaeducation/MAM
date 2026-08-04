"""Admin endpoint for viewing a client's transaction history."""

from __future__ import annotations

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from adminPanel.models import ClientTransaction, ClientUser
from backendPanel.permissions import IsAdmin, permission_required


async def _resolve_client_user(user_id: str) -> ClientUser | None:
    lookup = str(user_id).strip()
    if not lookup:
        return None

    user = await ClientUser.filter(user_code=lookup).first()
    if user is not None:
        return user

    if lookup.upper().startswith("USR-"):
        suffix = lookup.split("-", 1)[1]
        if suffix.isdigit():
            return await ClientUser.filter(id=int(suffix)).first()

    if lookup.isdigit():
        return await ClientUser.filter(id=int(lookup)).first()

    return None


def _serialize_transaction(transaction: ClientTransaction) -> dict:
    return {
        "id": transaction.id,
        "type": transaction.transaction_type,
        "amount": transaction.amount,
        "method": transaction.payment_method,
        "status": transaction.status,
        "date": transaction.created_at.strftime("%Y-%m-%d") if transaction.created_at else None,
    }


def _normalize_transaction_tab(raw_tab: str | None) -> str | None:
    value = str(raw_tab or "").strip().lower()
    if value in {"", "all", "*"}:
        return None
    if value in {"deposit", "deposits"}:
        return "deposit"
    if value in {"withdraw", "withdrawal", "withdrawals"}:
        return "withdrawal"
    if value in {"pending", "processing"}:
        return "pending"
    return None


def _transaction_matches_tab(transaction: ClientTransaction, tab: str | None) -> bool:
    if tab is None:
        return True

    transaction_type = str(transaction.transaction_type).strip().lower()
    status = str(transaction.status).strip().lower()

    if tab == "pending":
        return status in {"pending", "processing"}

    return transaction_type == tab


@permission_required(IsAdmin)
@require_http_methods(["GET"])
async def list_client_transactions(request, user_id: str):
    """Return a client's transaction history for the admin users page."""

    user = await _resolve_client_user(user_id)
    if user is None:
        return JsonResponse({"status": "error", "message": "Client user not found"}, status=404)

    tab = _normalize_transaction_tab(request.GET.get("tab") or request.GET.get("type"))
    transactions = (
        await ClientTransaction.filter(client_profile__user_id=user.id)
        .order_by("-created_at", "-id")
        .all()
    )
    filtered_transactions = [
        transaction for transaction in transactions if _transaction_matches_tab(transaction, tab)
    ]

    summary = {
        "total_transactions": len(transactions),
        "pending_count": sum(
            1 for transaction in transactions if str(transaction.status).strip().lower() in {"pending", "processing"}
        ),
        "total_volume": sum(transaction.amount for transaction in transactions),
        "deposit_count": sum(1 for transaction in transactions if str(transaction.transaction_type).strip().lower() == "deposit"),
        "withdrawal_count": sum(
            1 for transaction in transactions if str(transaction.transaction_type).strip().lower() == "withdrawal"
        ),
    }

    return JsonResponse(
        {
            "status": "ok",
            "user": {
                "id": user.user_code or f"USR-{user.id:03d}",
                "name": user.name,
                "email": user.email,
            },
            "tab": tab or "all",
            "summary": summary,
            "transactions": [_serialize_transaction(transaction) for transaction in filtered_transactions],
        }
    )
