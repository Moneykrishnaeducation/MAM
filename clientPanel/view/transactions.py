"""Client transactions endpoint."""

from django.http import JsonResponse

from adminPanel.models import ClientTransaction
from backendPanel.permissions import IsClient, permission_required
from clientPanel.view.common import _get_client_profile_for_request


def _normalize_transaction_tab(raw_tab: str | None) -> str | None:
    value = str(raw_tab or "").strip().lower()
    if value in {"", "all", "*"}:
        return None
    if value in {"deposit", "pending", "withdraw", "withdrawal"}:
        return "withdrawal" if value == "withdraw" else value
    return None


def _transaction_matches_tab(transaction: ClientTransaction, tab: str | None) -> bool:
    if tab is None:
        return True

    transaction_type = str(transaction.transaction_type).strip().lower()
    status = str(transaction.status).strip().lower()

    if tab == "pending":
        return status in {"pending", "processing"}

    if tab == "deposit":
        return transaction_type == "deposit"

    return transaction_type == "withdrawal"


def _serialize_transaction(transaction: ClientTransaction) -> dict:
    return {
        "id": transaction.id,
        "type": transaction.transaction_type,
        "amount": transaction.amount,
        "method": transaction.payment_method,
        "status": transaction.status,
        "date": transaction.created_at.strftime("%Y-%m-%d") if transaction.created_at else None,
    }


def _build_transaction_counts(transactions: list[ClientTransaction]) -> dict:
    return {
        "PENDING": sum(1 for tx in transactions if str(tx.status).strip().lower() in {"pending", "processing"}),
        "DEPOSIT": sum(1 for tx in transactions if str(tx.transaction_type).strip().lower() == "deposit"),
        "WITHDRAWAL": sum(1 for tx in transactions if str(tx.transaction_type).strip().lower() == "withdrawal"),
    }


@permission_required(IsClient)
async def get_client_transactions(request):
    """Load transactions for a client user directly from database."""
    profile, error = await _get_client_profile_for_request(request)
    if error:
        return error

    requested_tab = _normalize_transaction_tab(request.GET.get("tab") or request.GET.get("type"))
    transactions = (
        await ClientTransaction.filter(client_profile_id=profile.id)
        .order_by("-created_at", "-id")
        .all()
    )

    transaction_counts = _build_transaction_counts(transactions)
    filtered_transactions = [
        transaction for transaction in transactions if _transaction_matches_tab(transaction, requested_tab)
    ]

    summary = {
        "total_transactions": len(transactions),
        "pending_count": transaction_counts["PENDING"],
        "total_volume": sum(transaction.amount for transaction in transactions),
    }

    results = [_serialize_transaction(transaction) for transaction in filtered_transactions]

    return JsonResponse(
        {
            "status": "ok",
            "user_id": profile.user_id,
            "tab": requested_tab or "all",
            "counts": transaction_counts,
            "summary": summary,
            "transactions": results,
        }
    )
