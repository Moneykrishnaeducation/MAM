"""Client transactions endpoint."""

from datetime import date

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from adminPanel.models import ClientAccount, ClientTransaction, TradingAccount
from backendPanel.database import ensure_db_initialized
from backendPanel.permissions import IsClient, permission_required
from clientPanel.view.common import _get_client_profile_for_request


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

    if tab == "deposit":
        return transaction_type in {"deposit", "deposits"}

    return transaction_type in {"withdrawal", "withdrawals", "withdraw"}


def _parse_positive_int(
    raw_value: str | None, default: int, *, minimum: int = 1, maximum: int | None = None
) -> int:
    try:
        value = int(str(raw_value or "").strip())
    except (TypeError, ValueError):
        return default

    if value < minimum:
        value = minimum

    if maximum is not None and value > maximum:
        value = maximum

    return value


def _parse_date_param(raw_value: str | None) -> date | None:
    value = str(raw_value or "").strip()
    if not value:
        return None

    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _transaction_matches_filters(
    transaction: ClientTransaction,
    tab: str | None,
    search: str,
    from_date: date | None,
    to_date: date | None,
) -> bool:
    if not _transaction_matches_tab(transaction, tab):
        return False

    created_date = transaction.created_at.date() if transaction.created_at else None

    if from_date and (created_date is None or created_date < from_date):
        return False

    if to_date and (created_date is None or created_date > to_date):
        return False

    if search:
        haystack = " ".join(
            [
                str(transaction.id),
                str(transaction.transaction_type),
                str(transaction.payment_method),
                str(transaction.status),
                created_date.isoformat() if created_date else "",
                f"TXN-{transaction.id}",
                str(transaction.amount),
            ]
        ).lower()

        if search not in haystack:
            return False

    return True


def _serialize_transaction(transaction: ClientTransaction, account_map: dict) -> dict:
    raw_acc = transaction.account_number
    mapped_acc = account_map.get(raw_acc) if raw_acc else None
    if not mapped_acc and account_map:
        mapped_acc = list(account_map.values())[0]

    return {
        "id": transaction.id,
        "account_number": mapped_acc or raw_acc,
        "type": transaction.transaction_type,
        "amount": transaction.amount,
        "method": transaction.payment_method,
        "status": transaction.status,
        "date": transaction.created_at.strftime("%Y-%m-%d") if transaction.created_at else None,
    }


def _build_transaction_counts(transactions: list[ClientTransaction]) -> dict:
    return {
        "PENDING": sum(
            1 for tx in transactions if str(tx.status).strip().lower() in {"pending", "processing"}
        ),
        "DEPOSIT": sum(
            1 for tx in transactions if str(tx.transaction_type).strip().lower() == "deposit"
        ),
        "WITHDRAWAL": sum(
            1 for tx in transactions if str(tx.transaction_type).strip().lower() == "withdrawal"
        ),
    }


@permission_required(IsClient)
@require_http_methods(["GET"])
async def get_client_transactions(request):
    """Load transactions for a client user directly from database."""
    await ensure_db_initialized()
    profile, error = await _get_client_profile_for_request(request)
    if error:
        return error

    requested_tab = _normalize_transaction_tab(request.GET.get("tab") or request.GET.get("type"))
    search_term = str(request.GET.get("search") or request.GET.get("q") or "").strip().lower()
    from_date = _parse_date_param(request.GET.get("from_date") or request.GET.get("from"))
    to_date = _parse_date_param(request.GET.get("to_date") or request.GET.get("to"))
    page_requested = request.GET.get("page") is not None
    per_page_requested = (
        request.GET.get("per_page") is not None or request.GET.get("limit") is not None
    )
    paginate = page_requested or per_page_requested
    page = _parse_positive_int(request.GET.get("page"), 1) if paginate else 1
    per_page = (
        _parse_positive_int(
            request.GET.get("per_page") or request.GET.get("limit"), 10, maximum=1000
        )
        if paginate
        else 0
    )

    transactions = (
        await ClientTransaction.filter(user_id=profile.id).order_by("-created_at", "-id").all()
    )

    client_accounts = await ClientAccount.filter(user_id=profile.id).all()
    trading_accounts = await TradingAccount.filter(user_id=profile.id).all()

    account_map = {}
    for ca in client_accounts:
        matching_ta = next((ta for ta in trading_accounts if ta.id == ca.id), None)
        if matching_ta:
            account_map[ca.account_number] = matching_ta.account_id
        else:
            account_map[ca.account_number] = ca.account_number

    for ta in trading_accounts:
        account_map[ta.account_id] = ta.account_id

    # If map is empty, fallback to whatever we can find
    if not account_map:
        if trading_accounts:
            account_map[""] = trading_accounts[0].account_id
        elif client_accounts:
            account_map[""] = client_accounts[0].account_number

    if account_map:
        default_acc_num = list(account_map.values())[0]
        for tx in transactions:
            raw_acc = tx.account_number
            mapped_acc = account_map.get(raw_acc) if raw_acc else default_acc_num
            if mapped_acc and tx.account_number != mapped_acc:
                tx.account_number = mapped_acc
                await tx.save()

    transaction_counts = _build_transaction_counts(transactions)
    filtered_transactions = [
        transaction
        for transaction in transactions
        if _transaction_matches_filters(transaction, requested_tab, search_term, from_date, to_date)
    ]

    summary = {
        "total_transactions": len(transactions),
        "pending_count": transaction_counts["PENDING"],
        "total_volume": sum(transaction.amount for transaction in transactions),
    }

    if paginate:
        total_transactions = len(filtered_transactions)
        total_pages = max(1, (total_transactions + per_page - 1) // per_page)
        page = min(page, total_pages)
        start_index = (page - 1) * per_page
        end_index = start_index + per_page
        page_transactions = filtered_transactions[start_index:end_index]
    else:
        total_transactions = len(filtered_transactions)
        total_pages = None
        page = None
        per_page = None
        page_transactions = filtered_transactions

    results = [
        _serialize_transaction(transaction, account_map) for transaction in page_transactions
    ]

    response = {
        "status": "ok",
        "user_id": profile.id,
        "tab": requested_tab or "all",
        "counts": transaction_counts,
        "summary": summary,
        "transactions": results,
    }

    if paginate:
        response["pagination"] = {
            "page": page,
            "per_page": per_page,
            "total": total_transactions,
            "total_pages": total_pages,
            "has_next": page < total_pages if total_pages else False,
            "has_previous": page > 1,
        }

    return JsonResponse(response)
