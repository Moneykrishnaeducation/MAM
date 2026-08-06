"""Admin endpoint for the main transactions page."""

from __future__ import annotations

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from adminPanel.models import ClientTransaction
from backendPanel.permissions import IsAdmin, permission_required


def _normalize_transaction_tab(raw_tab: str | None) -> str | None:
    value = str(raw_tab or "").strip().lower()
    if value in {"", "all", "*"}:
        return None
    if value in {"pending", "processing"}:
        return "pending"
    if value in {"deposit", "deposits"}:
        return "deposit"
    if value in {"withdraw", "withdrawal", "withdrawals"}:
        return "withdraw"
    if value in {"internal", "internal transfer", "transfer", "transfers"}:
        return "internal"
    return None


def _transaction_family(transaction: ClientTransaction) -> str:
    transaction_type = str(transaction.transaction_type or "").strip().lower()
    if transaction_type in {"deposit", "deposits"}:
        return "deposit"
    if transaction_type in {"withdraw", "withdrawal", "withdrawals"}:
        return "withdraw"
    if transaction_type in {
        "credit-in",
        "credit_in",
        "credit out",
        "credit-out",
        "credit_out",
        "transfer",
        "internal transfer",
    }:
        return "internal"
    return "internal"


def _format_transaction_type(transaction: ClientTransaction) -> str:
    family = _transaction_family(transaction)
    if family == "deposit":
        return "Deposit"
    if family == "withdraw":
        return "Withdraw"
    return "Internal Transfer"


def _format_amount(transaction: ClientTransaction) -> str:
    family = _transaction_family(transaction)
    amount = float(transaction.amount or 0.0)
    prefix = "-" if family == "withdraw" else "+"
    return f"{prefix}${amount:,.2f}"


def _format_destination(transaction: ClientTransaction) -> str:
    family = _transaction_family(transaction)
    account_number = str(transaction.account_number or "").strip()
    account_id_to = str(transaction.account_id_to or "").strip()
    account_id_from = str(transaction.account_id_from or "").strip()
    description = str(transaction.description or "").strip()
    method = str(transaction.payment_method or "").strip().lower()

    if family == "deposit":
        if account_number:
            return f"Account: {account_number}"
        return description or "Account: N/A"

    if family == "withdraw":
        destination_value = account_id_to or account_number or description
        if not destination_value:
            return "Destination: N/A"
        if any(token in method for token in {"crypto", "wallet", "usdt", "token"}):
            return f"Wallet: {destination_value}"
        return f"Bank: {destination_value}"

    if account_id_from and account_id_to:
        return f"From: {account_id_from} -> {account_id_to}"
    if account_number:
        return f"Account: {account_number}"
    return description or "Internal Transfer"


def _serialize_transaction(transaction: ClientTransaction) -> dict:
    return {
        "id": f"TXN-{transaction.id}",
        "raw_id": transaction.id,
        "type": _format_transaction_type(transaction),
        "user": transaction.user.name if transaction.user else "Unknown",
        "email": transaction.email or (transaction.user.email if transaction.user else ""),
        "amount": _format_amount(transaction),
        "raw_amount": float(transaction.amount or 0.0),
        "method": transaction.payment_method or "Admin Manual Adjustment",
        "status": transaction.status or "Pending",
        "date": transaction.created_at.strftime("%Y-%m-%d") if transaction.created_at else None,
        "timestamp": transaction.created_at.isoformat() if transaction.created_at else None,
        "destination": _format_destination(transaction),
        "transaction_type": transaction.transaction_type,
        "account_number": transaction.account_number,
        "account_id_from": transaction.account_id_from,
        "account_id_to": transaction.account_id_to,
        "description": transaction.description,
    }


def _transaction_matches_tab(transaction: ClientTransaction, tab: str | None) -> bool:
    if tab is None:
        return True

    status = str(transaction.status or "").strip().lower()
    family = _transaction_family(transaction)

    if tab == "pending":
        return status in {"pending", "processing"}

    return family == tab


def _transaction_matches_search(transaction: ClientTransaction, search: str) -> bool:
    if not search:
        return True

    haystack = " ".join(
        [
            str(transaction.id),
            str(transaction.transaction_type or ""),
            str(transaction.payment_method or ""),
            str(transaction.status or ""),
            str(transaction.account_number or ""),
            str(transaction.account_id_from or ""),
            str(transaction.account_id_to or ""),
            str(transaction.description or ""),
            str(transaction.email or ""),
            str(transaction.user.name if transaction.user else ""),
            str(transaction.user.email if transaction.user else ""),
        ]
    ).lower()
    return search in haystack


@csrf_exempt
@permission_required(IsAdmin)
@require_http_methods(["GET"])
async def list_admin_transactions(request):
    """Return transaction data for the main admin transactions page."""

    tab = _normalize_transaction_tab(request.GET.get("tab") or request.GET.get("type"))
    search = str(request.GET.get("search") or request.GET.get("q") or "").strip().lower()

    queryset = ClientTransaction.all().order_by("-created_at", "-id").prefetch_related("user")
    transactions = await queryset

    filtered_transactions = [
        transaction
        for transaction in transactions
        if _transaction_matches_tab(transaction, tab)
        and _transaction_matches_search(transaction, search)
    ]

    summary = {
        "total_transactions": len(transactions),
        "pending_count": sum(
            1
            for transaction in transactions
            if str(transaction.status or "").strip().lower() in {"pending", "processing"}
        ),
        "deposit_count": sum(
            1 for transaction in transactions if _transaction_family(transaction) == "deposit"
        ),
        "withdrawal_count": sum(
            1 for transaction in transactions if _transaction_family(transaction) == "withdraw"
        ),
        "internal_count": sum(
            1 for transaction in transactions if _transaction_family(transaction) == "internal"
        ),
        "total_volume": sum(float(transaction.amount or 0.0) for transaction in transactions),
    }

    return JsonResponse(
        {
            "status": "ok",
            "tab": tab or "all",
            "search": search,
            "summary": summary,
            "transactions": [
                _serialize_transaction(transaction) for transaction in filtered_transactions
            ],
        }
    )
