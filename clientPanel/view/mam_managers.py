"""MAM Manager endpoints for client operations."""

import json
import logging

from backendPanel.mail_queue import queue_email_message
from django.http import JsonResponse
from django.template.loader import render_to_string
from django.views.decorators.csrf import csrf_exempt

from adminPanel.models import ClientUser, TradingAccount, ProfitShareHistory
from adminPanel.mt5.services import MT5ManagerActions
from adminPanel.view.mail import _frontend_base_url
from backendPanel.database import ensure_db_initialized
from backendPanel.permissions import IsClient, permission_required
from clientPanel.view.common import _error, _resolve_client_user_id

logger = logging.getLogger(__name__)


def _manager_avatar(name: str) -> str:
    return (
        f"https://ui-avatars.com/api/?name={name.replace(' ', '+')}&background=1e293b&color=34d399&size=128&bold=true"
    )


def _manager_label(mgr: TradingAccount) -> str:
    return mgr.account_name or (mgr.user.name if mgr.user else "MAM Manager")


def _manager_email(mgr: TradingAccount) -> str:
    return mgr.user.email if mgr.user else "manager@mam.com"


def _manager_status(mgr: TradingAccount) -> str:
    return mgr.status or "Active"


def _manager_strategy(mgr: TradingAccount) -> str:
    return mgr.risk_level or "Quantitative Grid"


def _manager_fee(mgr: TradingAccount) -> str:
    return f"{mgr.profit_sharing_percentage or 20.0}%"


def _manager_risk_label(status: str) -> str:
    lowered = str(status or "").strip().lower()
    if lowered == "active":
        return "Low"
    if lowered in {"inactive", "suspended", "disabled"}:
        return "High"
    return "Medium"


def _serialize_manager_row(mgr: TradingAccount, investor_count: int) -> dict:
    name = _manager_label(mgr)
    email = _manager_email(mgr)
    account_id = mgr.account_id or ""
    status = _manager_status(mgr)
    strategy = _manager_strategy(mgr)
    fee = _manager_fee(mgr)
    aum = float(mgr.balance)
    avatar = _manager_avatar(name)
    return {
        "id": mgr.id,
        "account_id": account_id,
        "name": name,
        "email": email,
        "strategy": strategy,
        "aum": aum,
        "performance_fee": fee,
        "status": status,
        "investors_count": investor_count,
        "risk": _manager_risk_label(status),
        "balance": aum,
        "profit": strategy,
        "share": fee,
        "investorsList": [],
        "role": strategy,
        "experience": f"Linked {investor_count} live investment{'s' if investor_count != 1 else ''}",
        "phone": f"AUM ${aum:,.2f}",
        "avatar": avatar,
        "aum_label": f"${aum:,.2f}",
        "account_name": _manager_label(mgr),
        "payout_cycle": mgr.payout_frequency or "weekly",
        "algo_trading": "Automatic" if mgr.copy_trade_enabled or mgr.dual_trade_enabled else "Manual",
        "master_security": "Enabled" if mgr.is_enabled else "Disabled",
        "account_settings": {
            "account_name": _manager_label(mgr),
            "payout_cycle": mgr.payout_frequency or "weekly",
            "algo_trading": "Automatic" if mgr.copy_trade_enabled or mgr.dual_trade_enabled else "Manual",
            "status": status,
            "leverage": f"1:{mgr.leverage}",
        },
        "wallet": {
            "pending": float(mgr.balance or 0.0),
            "settled": float(max(float(mgr.balance or 0.0) - float(mgr.equity or 0.0), 0.0)),
        },
    }


async def _manager_investor_rows(mgr: TradingAccount, user_id: int | None = None) -> list[dict]:
    investors = (
        await TradingAccount.filter(mam_master_account=mgr).prefetch_related("user").all()
    )
    client_name = (
        (mgr.user.name if mgr.user else None)
        or (mgr.account_name or "Investor")
    )
    return [
        {
            "id": f"INV-{inv.account_id}",
            "accountId": inv.account_id,
            "name": inv.user.name if inv.user else client_name,
            "email": inv.user.email if inv.user else "",
            "invested": f"${float(inv.equity):,.2f}",
            "profit": f"${float(inv.balance):,.2f}",
            "status": inv.status or "Active",
        }
        for inv in investors
    ]


async def _load_manager_detail(
    *, user_id: int, account_id: str
) -> tuple[TradingAccount | None, list[dict], int]:
    manager = (
        await TradingAccount.filter(account_type="MAM", user_id=user_id, account_id=str(account_id))
        .prefetch_related("user")
        .first()
        or await TradingAccount.filter(account_type="MAM", user_id=user_id, id=account_id)
        .prefetch_related("user")
        .first()
    )
    if manager is None:
        return None, [], 0

    investors = await _manager_investor_rows(manager, user_id=user_id)
    return manager, investors, len(investors)


@permission_required(IsClient)
async def get_my_mam_manager_detail(request, account_id: str):
    """Return the expanded manager card data for a single client-owned MAM manager."""
    await ensure_db_initialized()

    user_id = await _resolve_client_user_id(request)
    if user_id is None:
        return _error("Authenticated session is required", status=401)

    manager, investors, investor_count = await _load_manager_detail(user_id=user_id, account_id=account_id)
    if manager is None:
        return _error(f"MAM Manager account {account_id} not found or access denied", status=404)

    manager_row = _serialize_manager_row(manager, investor_count)
    
    pending_rows = await ProfitShareHistory.filter(master_login=str(manager.account_id), status="Pending").values("commission_amount")
    pending_wallet = sum(float(r["commission_amount"] or 0) for r in pending_rows)

    settled_rows = await ProfitShareHistory.filter(master_login=str(manager.account_id), status="Completed").values("commission_amount")
    settled_value = sum(float(r["commission_amount"] or 0) for r in settled_rows)
    
    manager_row.update(
        {
            "experience": f"Linked {investor_count} live investment{'s' if investor_count != 1 else ''}",
            "role": manager.risk_level or "MAM Portfolio Manager",
            "phone": str(manager.account_id or ""),
            "avatar": _manager_avatar(manager_row["name"]),
            "investorsList": investors,
            "investors_count": investor_count,
            "accountSettings": {
                "accountName": manager.account_name or manager_row["name"],
                "payoutCycle": manager.payout_frequency or "weekly",
                "algoTrading": "Automatic"
                if manager.copy_trade_enabled or manager.dual_trade_enabled
                else "Manual",
                "status": manager.status or "Active",
                "leverage": f"1:{manager.leverage}",
                "masterSecurity": "Enabled" if manager.is_enabled else "Disabled",
            },
            "performanceSummary": {
                "aum": float(manager.balance or 0.0),
                "netBalance": float(manager.balance or 0.0),
                "totalProfit": float(max(float(manager.balance or 0.0) - float(manager.equity or 0.0), 0.0)),
                "performanceFee": manager.profit_sharing_percentage or 20.0,
                "status": manager.status or "Active",
                "leverage": f"1:{manager.leverage}",
            },
            "wallet": {
                "pending": pending_wallet,
                "settled": settled_value,
                "liveManagers": investor_count,
            },
            "configuration": {
                "accountName": manager.account_name or manager_row["name"],
                "payoutCycle": manager.payout_frequency or "weekly",
                "algoTrading": "Automatic"
                if manager.copy_trade_enabled or manager.dual_trade_enabled
                else "Manual",
                "status": manager.status or "Active",
                "masterSecurity": "Enabled" if manager.is_enabled else "Disabled",
                "strategy": manager.risk_level or "Quantitative Grid",
                "performanceFee": f"{manager.profit_sharing_percentage or 20.0}%",
            },
        }
    )

    return JsonResponse({"status": "ok", "manager": manager_row})


def _render_investor_credentials_email(
    *,
    user_name: str,
    login: str | int,
    group: str,
    account_name: str,
    leverage: int | None,
    master_password: str | None,
    investor_password: str | None,
) -> tuple[str, str, str]:
    context = {
        "user_name": user_name or "there",
        "account_type": "Investor",
        "account_name": account_name or "",
        "login": str(login),
        "group": group,
        "leverage": leverage,
        "master_password": master_password or "",
        "investor_password": investor_password or "",
        "frontend_base_url": _frontend_base_url(),
    }
    subject = "Investor account credentials"
    plain_body = render_to_string("emails/investor_credentials_email.txt", context).strip()
    html_body = render_to_string("emails/investor_credentials_email.html", context)
    return subject, plain_body, html_body


async def _send_investor_credentials_email(
    *,
    user: ClientUser,
    login: str | int,
    group: str,
    account_name: str,
    leverage: int | None,
    master_password: str | None = None,
    investor_password: str | None = None,
) -> None:
    subject, plain_body, html_body = _render_investor_credentials_email(
        user_name=user.name or user.email or "there",
        login=login,
        group=group,
        account_name=account_name,
        leverage=leverage,
        master_password=master_password,
        investor_password=investor_password,
    )
    await queue_email_message(
        subject=subject,
        body=plain_body,
        html_body=html_body,
        to=[user.email],
        source="mam_investor_credentials",
        payload={
            "account_name": account_name,
            "login": str(login),
            "group": group,
            "leverage": leverage,
        },
    )


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

    managers = (
        await TradingAccount.filter(user_id=user_id, account_type="MAM")
        .order_by("-created_at")
        .prefetch_related("user")
        .all()
    )

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

        results.append(
            {
                "id": m.id,
                "account_id": acc_id,
                "name": name,
                "email": email,
                "strategy": m.risk_level or "Quantitative Grid",
                "aum": float(m.balance),
                "performance_fee": f"{m.profit_sharing_percentage or 20.0}%",
                "status": m.status or "Active",
                "investors_count": investor_counts.get(m.id, 0),
            }
        )

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

    managers = (
        await TradingAccount.filter(account_type="MAM", is_enabled=True)
        .filter(status__iexact="Active")
        .order_by("-created_at")
        .prefetch_related("user")
        .all()
    )

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

        results.append(
            {
                "id": m.id,
                "account_id": acc_id,
                "name": name,
                "email": email,
                "strategy": m.risk_level or "Quantitative Grid",
                "aum": float(m.balance),
                "performance_fee": f"{m.profit_sharing_percentage or 20.0}%",
                "status": m.status or "Active",
                "investors_count": investor_counts.get(m.id, 0),
            }
        )

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

    manager_acc = (
        body.get("managerAccNumber") or body.get("manager_account_id") or body.get("manager_id")
    )
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
        master_password=None,  # Generates a random master password so user cannot execute manual trades
        investor_password=investment_pwd,  # User's chosen password is set as read-only Investor Password
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

    try:
        await _send_investor_credentials_email(
            user=user,
            login=result["login"],
            group=result["group"],
            account_name=f"Investor for {mam_master.account_name or mam_master.account_id}",
            leverage=mam_master.leverage,
            master_password=result.get("master_password"),
            investor_password=result.get("investor_password"),
        )
    except Exception as exc:
        logger.error(f"Failed to send investor credentials email to {user.email}: {exc}")

    return JsonResponse(
        {
            "status": "ok",
            "message": f"Successfully invested with Manager {mam_master.account_id}",
            "account": {
                "login": result["login"],
                "group": result["group"],
                "manager_account_id": mam_master.account_id,
                "account_name": f"Investor for {mam_master.account_name or mam_master.account_id}",
            },
        }
    )


@permission_required(IsClient)
async def get_manager_investors(request, account_id: str):
    """Fetch assigned investors list for a specific MAM master manager account owned by the client."""
    await ensure_db_initialized()
    user_id = await _resolve_client_user_id(request)

    mam_master = (
        await TradingAccount.filter(
            account_id=str(account_id), account_type="MAM", user_id=user_id
        ).first()
        or await TradingAccount.filter(id=account_id, account_type="MAM", user_id=user_id).first()
    )
    if not mam_master:
        return _error(f"MAM Master account {account_id} not found or access denied", status=404)

    investors = (
        await TradingAccount.filter(mam_master_account=mam_master).prefetch_related("user").all()
    )
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

    return JsonResponse(
        {
            "status": "ok",
            "mam_account_id": mam_master.account_id,
            "investors": investor_data,
        }
    )


@csrf_exempt
@permission_required(IsClient)
async def toggle_manager_status(request, account_id: str):
    """Activate or deactivate a MAM manager account to show or hide it in the available list."""
    if request.method != "POST":
        return _error("Only POST method is allowed", status=405)

    await ensure_db_initialized()
    user_id = await _resolve_client_user_id(request)

    mam_master = (
        await TradingAccount.filter(
            account_id=str(account_id), account_type="MAM", user_id=user_id
        ).first()
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

    return JsonResponse(
        {
            "status": "ok",
            "message": f"MAM Manager account {mam_master.account_id} is now {mam_master.status}",
            "account_status": mam_master.status,
            "is_enabled": mam_master.is_enabled,
        }
    )


@csrf_exempt
@permission_required(IsClient)
async def trigger_manager_settlement(request, account_id: str):
    """Trigger manual settlement of pending profit share commissions for a manager."""
    if request.method != "POST":
        return _error("Only POST method is allowed", status=405)

    await ensure_db_initialized()
    user_id = await _resolve_client_user_id(request)

    mam_master = (
        await TradingAccount.filter(
            account_id=str(account_id), account_type="MAM", user_id=user_id
        ).first()
        or await TradingAccount.filter(id=account_id, account_type="MAM", user_id=user_id).first()
    )
    if not mam_master:
        return _error(f"MAM Master account {account_id} not found or access denied", status=404)

    pending_rows = await ProfitShareHistory.filter(
        master_login=str(mam_master.account_id), status="Pending"
    ).all()

    if not pending_rows:
        return JsonResponse({"status": "ok", "message": "No pending settlement."})

    total_commission = sum(float(r.commission_amount or 0) for r in pending_rows)

    if total_commission > 0:
        try:
            mt5 = MT5ManagerActions()
            if mt5.connection_error:
                return _error(f"MT5 Connection failed: {mt5.connection_error}", status=500)
            
            success = mt5.deposit_funds(
                login_id=int(mam_master.account_id),
                amount=total_commission,
                comment="Profit Share Settlement"
            )
            if not success:
                return _error("Failed to credit master account on MT5 server", status=500)
        except Exception as e:
            logger.error(f"Error triggering settlement: {e}")
            return _error(f"Error triggering settlement: {str(e)}", status=500)

    # Update all pending to completed
    for row in pending_rows:
        row.status = "Completed"
        await row.save()

    return JsonResponse(
        {
            "status": "ok",
            "message": f"Successfully settled ${total_commission:,.2f} to manager account {mam_master.account_id}",
            "settled_amount": total_commission
        }
    )


@csrf_exempt
@permission_required(IsClient)
async def reset_investor_password(request):
    """Reset the investor password for an investor trading account owned by the client or linked to a client's MAM manager."""
    if request.method != "POST":
        return _error("Only POST method is allowed", status=405)

    await ensure_db_initialized()
    user_id = await _resolve_client_user_id(request)
    if user_id is None:
        return _error("Authenticated session is required", status=401)

    try:
        body = json.loads(request.body) if request.body else {}
    except Exception:
        return _error("Invalid JSON body")

    account_id = body.get("account_id") or body.get("accountId") or body.get("login")
    new_password = body.get("new_password") or body.get("newPassword") or body.get("password")
    password_type = str(body.get("password_type") or body.get("passwordType") or "investor").lower()

    if not account_id:
        return _error("account_id (or accountId / login) is required")

    if not new_password:
        return _error("new_password is required")

    # The trading account must belong to the client OR be an investor account linked to a MAM master owned by the client
    account = (
        await TradingAccount.filter(account_id=str(account_id), user_id=user_id).first()
        or await TradingAccount.filter(id=account_id, user_id=user_id).first()
    )

    if not account:
        # Check if client owns the master MAM account that this investor belongs to
        inv_acc = (
            await TradingAccount.filter(account_id=str(account_id), account_type="Investor")
            .prefetch_related("mam_master_account")
            .first()
            or await TradingAccount.filter(id=account_id, account_type="Investor")
            .prefetch_related("mam_master_account")
            .first()
        )
        if inv_acc and inv_acc.mam_master_account and inv_acc.mam_master_account.user_id == user_id:
            account = inv_acc

    if not account:
        return _error("Trading account not found or access denied", status=404)

    try:
        mt5 = MT5ManagerActions()
        if mt5.connection_error:
            return _error(f"MT5 Connection failed: {mt5.connection_error}", status=500)

        success = mt5.change_password(
            login_id=int(account.account_id),
            new_password=new_password,
            password_type=password_type,
        )

        if success:
            return JsonResponse(
                {
                    "status": "ok",
                    "message": f"Successfully updated {password_type} password for account #{account.account_id}",
                    "account_id": account.account_id,
                }
            )
        else:
            return _error("Failed to update password on MT5 server", status=500)
    except Exception as e:
        logger.error(f"Error resetting password for account {account_id}: {e}")
        return _error(f"Error resetting password: {str(e)}", status=500)
