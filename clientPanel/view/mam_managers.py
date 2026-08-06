"""MAM Manager endpoints for client operations."""

import json
import logging

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from adminPanel.models import ClientUser, TradingAccount
from adminPanel.mt5.services import MT5ManagerActions
from backendPanel.database import ensure_db_initialized
from backendPanel.permissions import IsClient, permission_required
from clientPanel.view.common import _error, _resolve_client_user_id

logger = logging.getLogger(__name__)


@permission_required(IsClient)
async def list_my_mam_managers(request):
    """List MAM manager master accounts owned by the logged-in client user."""
    await ensure_db_initialized()

    user_id = await _resolve_client_user_id(request)
    if user_id is None:
        return _error("Authenticated session is required", status=401)

    raw_page = request.GET.get("page")
    raw_per_page = request.GET.get("per_page") or request.GET.get("limit")
    search_q = str(request.GET.get("search") or request.GET.get("q") or "").strip().lower()

    paginate = raw_page is not None or raw_per_page is not None

    def _parse_positive_int(val, default):
        try:
            parsed = int(str(val).strip())
            return max(1, parsed)
        except (ValueError, TypeError):
            return default

    page = _parse_positive_int(raw_page, 1)
    per_page = _parse_positive_int(raw_per_page, 10)

    managers = await TradingAccount.filter(
        user_id=user_id,
        account_type="MAM"
    ).prefetch_related("user").all()

    investor_accounts = await TradingAccount.filter(
        account_type="Investor",
        mam_master_account_id__not_isnull=True,
    ).all()
    investor_counts = {}
    for inv in investor_accounts:
        master_id = inv.mam_master_account_id
        if master_id:
            investor_counts[master_id] = investor_counts.get(master_id, 0) + 1

    results = []
    for m in managers:
        name = m.account_name or (m.user.name if m.user else "MAM Manager")
        email = m.user.email if m.user else "manager@mam.com"
        acc_id = m.account_id or ""

        if search_q:
            haystack = f"{name} {email} {acc_id}".lower()
            if search_q not in haystack:
                continue

        results.append({
            "id": m.id,
            "account_id": acc_id,
            "name": name,
            "email": email,
            "strategy": m.risk_level or "Quantitative Grid",
            "aum": float(m.balance),
            "performance_fee": f"{m.profit_sharing_percentage or 20.0}%",
            "status": m.status or "Active",
            "investors_count": investor_counts.get(m.id, 0),
        })

    total = len(results)

    if paginate:
        total_pages = max(1, (total + per_page - 1) // per_page)
        page = min(page, total_pages)
        start_index = (page - 1) * per_page
        end_index = start_index + per_page
        paginated_results = results[start_index:end_index]

        response = {
            "status": "ok",
            "managers": paginated_results,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_previous": page > 1,
            },
        }
    else:
        response = {
            "status": "ok",
            "managers": results,
        }

    return JsonResponse(response)


@permission_required(IsClient)
async def list_mam_managers(request):
    """List available MAM manager accounts for client investment selection with search and pagination."""
    await ensure_db_initialized()

    raw_page = request.GET.get("page")
    raw_per_page = request.GET.get("per_page") or request.GET.get("limit")
    search_q = str(request.GET.get("search") or request.GET.get("q") or "").strip().lower()

    paginate = raw_page is not None or raw_per_page is not None

    def _parse_positive_int(val, default):
        try:
            parsed = int(str(val).strip())
            return max(1, parsed)
        except (ValueError, TypeError):
            return default

    page = _parse_positive_int(raw_page, 1)
    per_page = _parse_positive_int(raw_per_page, 10)

    managers = await TradingAccount.filter(
        account_type="MAM",
        is_enabled=True,
    ).filter(status__iexact="Active").prefetch_related("user").all()

    # Pre-count investor accounts linked per master manager account
    investor_accounts = await TradingAccount.filter(
        account_type="Investor",
        mam_master_account_id__not_isnull=True,
    ).all()
    investor_counts = {}
    for inv in investor_accounts:
        master_id = inv.mam_master_account_id
        if master_id:
            investor_counts[master_id] = investor_counts.get(master_id, 0) + 1

    results = []
    for m in managers:
        name = m.account_name or (m.user.name if m.user else "MAM Manager")
        email = m.user.email if m.user else "manager@mam.com"
        acc_id = m.account_id or ""

        if search_q:
            haystack = f"{name} {email} {acc_id}".lower()
            if search_q not in haystack:
                continue

        results.append({
            "id": m.id,
            "account_id": acc_id,
            "name": name,
            "email": email,
            "strategy": m.risk_level or "Quantitative Grid",
            "aum": float(m.balance),
            "performance_fee": f"{m.profit_sharing_percentage or 20.0}%",
            "status": m.status or "Active",
            "investors_count": investor_counts.get(m.id, 0),
        })

    total = len(results)

    if paginate:
        total_pages = max(1, (total + per_page - 1) // per_page)
        page = min(page, total_pages)
        start_index = (page - 1) * per_page
        end_index = start_index + per_page
        paginated_results = results[start_index:end_index]

        response = {
            "status": "ok",
            "managers": paginated_results,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_previous": page > 1,
            },
        }
    else:
        response = {
            "status": "ok",
            "managers": results,
        }

    return JsonResponse(response)


@csrf_exempt
@permission_required(IsClient)
async def invest_in_manager(request):
    """Create an investor account linked to a specific MAM manager account and allocate investment."""
    if request.method != "POST":
        return _error("Only POST method is allowed", status=405)

    await ensure_db_initialized()

    user_id = await _resolve_client_user_id(request)
    user = await ClientUser.filter(id=user_id).first()
    if not user:
        return _error("Client user not found", status=404)

    try:
        body = json.loads(request.body) if request.body else {}
    except Exception:
        return _error("Invalid JSON body")

    manager_acc = body.get("managerAccNumber") or body.get("manager_account_id") or body.get("manager_id")
    if not manager_acc:
        return _error("Manager account number (managerAccNumber or manager_account_id) is required")

    mam_master = (
        await TradingAccount.filter(account_id=str(manager_acc), account_type="MAM").first()
        or await TradingAccount.filter(id=manager_acc, account_type="MAM").first()
    )
    if not mam_master:
        return _error(f"MAM Master account {manager_acc} not found", status=404)

    investment_pwd = body.get("investmentPassword") or body.get("password")
    if not investment_pwd:
        return _error("Investment password is required")

    try:
        mt5 = MT5ManagerActions()
        if mt5.connection_error:
            return _error(f"MT5 Connection failed: {mt5.connection_error}", status=500)
    except Exception as e:
        logger.error(f"MT5 Manager init failed: {e}")
        return _error(f"MT5 Connection failed: {e}", status=500)

    result = mt5.create_investor_account(
        name=user.name,
        email=user.email,
        phone=user.phone or "",
        country=user.country or "United States",
        leverage=mam_master.leverage,
        master_password=investment_pwd,
        investor_password=investment_pwd,
        mam_master_login=int(mam_master.account_id),
        initial_balance=0.0,
        user_id=user.id,
    )

    if not result:
        return _error("Failed to create investor account on MT5 server", status=500)

    trading_account = await TradingAccount.get(id=result["trading_account_id"])
    trading_account.user = user
    trading_account.mam_master_account = mam_master
    await trading_account.save()

    return JsonResponse({
        "status": "ok",
        "message": f"Successfully invested with Manager {mam_master.account_id}",
        "account": {
            "login": result["login"],
            "group": result["group"],
            "manager_account_id": mam_master.account_id,
        },
    })


@permission_required(IsClient)
async def get_manager_investors(request, account_id: str):
    """Fetch assigned investors list for a specific MAM master manager account owned by the client."""
    await ensure_db_initialized()
    user_id = await _resolve_client_user_id(request)

    mam_master = (
        await TradingAccount.filter(account_id=str(account_id), account_type="MAM", user_id=user_id).first()
        or await TradingAccount.filter(id=account_id, account_type="MAM", user_id=user_id).first()
    )
    if not mam_master:
        return _error(f"MAM Master account {account_id} not found or access denied", status=404)

    investors = await TradingAccount.filter(mam_master_account=mam_master).prefetch_related("user").all()
    investor_data = [
        {
            "id": f"INV-{inv.account_id}",
            "accountId": inv.account_id,
            "name": inv.user.name if inv.user else inv.account_name,
            "email": inv.user.email if inv.user else "",
            "invested": f"${float(inv.equity):,.2f}",
            "profit": f"${float(inv.balance):,.2f}",
            "status": inv.status or "Active",
        }
        for inv in investors
    ]

    return JsonResponse({
        "status": "ok",
        "mam_account_id": mam_master.account_id,
        "investors": investor_data,
    })


@csrf_exempt
@permission_required(IsClient)
async def toggle_manager_status(request, account_id: str):
    """Activate or deactivate a MAM manager account to show or hide it in the available list."""
    if request.method != "POST":
        return _error("Only POST method is allowed", status=405)

    await ensure_db_initialized()
    user_id = await _resolve_client_user_id(request)

    mam_master = (
        await TradingAccount.filter(account_id=str(account_id), account_type="MAM", user_id=user_id).first()
        or await TradingAccount.filter(id=account_id, account_type="MAM", user_id=user_id).first()
    )
    if not mam_master:
        return _error(f"MAM Master account {account_id} not found or access denied", status=404)

    try:
        body = json.loads(request.body) if request.body else {}
    except Exception:
        body = {}

    action = body.get("action")  # "activate" or "deactivate" or toggle if omitted
    if action == "activate":
        mam_master.status = "Active"
        mam_master.is_enabled = True
    elif action == "deactivate":
        mam_master.status = "Inactive"
        mam_master.is_enabled = False
    else:
        # Toggle
        if str(mam_master.status).strip().lower() == "active":
            mam_master.status = "Inactive"
            mam_master.is_enabled = False
        else:
            mam_master.status = "Active"
            mam_master.is_enabled = True

    await mam_master.save()

    return JsonResponse({
        "status": "ok",
        "message": f"MAM Manager account {mam_master.account_id} is now {mam_master.status}",
        "account_status": mam_master.status,
        "is_enabled": mam_master.is_enabled,
    })

