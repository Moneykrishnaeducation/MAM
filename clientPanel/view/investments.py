"""Client investments endpoint."""

import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from adminPanel.models import TradingAccount
from adminPanel.mt5.services import MT5ManagerActions
from backendPanel.database import ensure_db_initialized
from backendPanel.permissions import IsClient, permission_required
from clientPanel.view.common import _error, _get_client_profile_for_request, _resolve_client_user_id


@permission_required(IsClient)
async def get_client_investments(request):
    """Load allocated investments for a client user based on their investor accounts with optional pagination."""
    await ensure_db_initialized()
    profile, error = await _get_client_profile_for_request(request)
    if error:
        return error

    raw_page = request.GET.get("page")
    raw_per_page = request.GET.get("per_page") or request.GET.get("limit")
    raw_search = (request.GET.get("search") or request.GET.get("query") or "").strip().lower()

    paginate = raw_page is not None or raw_per_page is not None

    def _parse_positive_int(val, default):
        try:
            parsed = int(str(val).strip())
            return max(1, parsed)
        except (ValueError, TypeError):
            return default

    page = _parse_positive_int(raw_page, 1)
    per_page = _parse_positive_int(raw_per_page, 10)

    investments = (
        await TradingAccount.filter(user_id=profile.id, account_type="Investor")
        .order_by("-created_at")
        .prefetch_related("mam_master_account", "mam_master_account__user")
        .all()
    )

    results = []
    for inv in investments:
        strategy_name = (
            inv.mam_master_account.account_name if inv.mam_master_account else "Unknown Strategy"
        )
        manager_name = (
            inv.mam_master_account.user.name
            if (inv.mam_master_account and inv.mam_master_account.user)
            else "Unknown Manager"
        )

        balance_val = float(inv.balance)
        equity_val = float(inv.equity)
        return_pct = ((equity_val - balance_val) / balance_val * 100) if balance_val > 0 else 0.0

        results.append(
            {
                "id": inv.id,
                "account_id": inv.account_id,
                "strategy": strategy_name,
                "manager": manager_name,
                "allocated": balance_val,
                "current_value": equity_val,
                "return_pct": round(return_pct, 2),
                "status": inv.status or "Active",
                "investor_allow_copy": inv.investor_allow_copy,
                "leverage": f"{inv.leverage}x",
                "copy_mode": inv.copy_mode or "balance",
                "copy_factor": float(inv.copy_factor) if inv.copy_factor is not None else 1.0,
                "multi_trade_count": inv.multi_trade_count,
                "manager_account_id": inv.mam_master_account.account_id
                if inv.mam_master_account
                else None,
            }
        )

    if raw_search:
        def _matches(record):
            searchable = " ".join(
                str(record.get(field) or "")
                for field in (
                    "strategy",
                    "manager",
                    "account_id",
                    "status",
                    "allocated",
                    "current_value",
                    "return_pct",
                    "manager_account_id",
                )
            ).lower()
            return raw_search in searchable

        results = [record for record in results if _matches(record)]

    total = len(results)

    if paginate:
        total_pages = max(1, (total + per_page - 1) // per_page)
        page = min(page, total_pages)
        start_index = (page - 1) * per_page
        end_index = start_index + per_page
        paginated_results = results[start_index:end_index]

        response = {
            "status": "ok",
            "user_id": profile.id,
            "investments": paginated_results,
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
            "user_id": profile.id,
            "investments": results,
        }

    return JsonResponse(response)


@csrf_exempt
@permission_required(IsClient)
async def pause_copying_api(request):
    """Pause copying for an investor account in MT5."""
    if request.method != "POST":
        return _error("Only POST method is allowed", status=405)

    await ensure_db_initialized()

    user_id = await _resolve_client_user_id(request)
    if user_id is None:
        return _error("Authenticated session is required", status=401)

    try:
        body = json.loads(request.body) if request.body else {}
        account_id = body.get("account_id")
    except Exception:
        return _error("Invalid JSON body")

    if not account_id:
        return _error("account_id is required")

    account = (
        await TradingAccount.filter(
            account_id=str(account_id), user_id=user_id, account_type="Investor"
        )
        .prefetch_related("mam_master_account")
        .first()
    )

    if not account:
        return _error("Trading account not found or access denied", status=404)

    try:
        mt5 = MT5ManagerActions()
        if mt5.connection_error:
            return _error(f"MT5 Connection failed: {mt5.connection_error}", status=500)

        success = mt5.pause_mam_copy(int(account.account_id))
        if success:
            account.investor_allow_copy = False
            await account.save()
            return JsonResponse({"status": "ok", "message": "Copying paused successfully"})
        else:
            return _error("Failed to pause copying in MT5 server", status=500)
    except Exception as e:
        return _error(f"Error pausing copying: {str(e)}", status=500)


@csrf_exempt
@permission_required(IsClient)
async def start_copying_api(request):
    """Start or resume copying for an investor account in MT5."""
    if request.method != "POST":
        return _error("Only POST method is allowed", status=405)

    await ensure_db_initialized()

    user_id = await _resolve_client_user_id(request)
    if user_id is None:
        return _error("Authenticated session is required", status=401)

    try:
        body = json.loads(request.body) if request.body else {}
        account_id = body.get("account_id")
    except Exception:
        return _error("Invalid JSON body")

    if not account_id:
        return _error("account_id is required")

    account = (
        await TradingAccount.filter(
            account_id=str(account_id), user_id=user_id, account_type="Investor"
        )
        .prefetch_related("mam_master_account")
        .first()
    )

    if not account:
        return _error("Trading account not found or access denied", status=404)

    if not account.mam_master_account:
        return _error("This investor account is not linked to any MAM master strategy", status=400)

    try:
        mt5 = MT5ManagerActions()
        if mt5.connection_error:
            return _error(f"MT5 Connection failed: {mt5.connection_error}", status=500)

        success = mt5.start_mam_copy(
            int(account.account_id), int(account.mam_master_account.account_id)
        )
        if success:
            account.investor_allow_copy = True
            await account.save()
            return JsonResponse({"status": "ok", "message": "Copying started successfully"})
        else:
            return _error("Failed to start copying in MT5 server", status=500)
    except Exception as e:
        return _error(f"Error starting copying: {str(e)}", status=500)


@csrf_exempt
@permission_required(IsClient)
async def deploy_coefficient_config_api(request):
    """Deploy coefficient configuration for an investor account."""
    if request.method != "POST":
        return _error("Only POST method is allowed", status=405)

    await ensure_db_initialized()

    user_id = await _resolve_client_user_id(request)
    if user_id is None:
        return _error("Authenticated session is required", status=401)

    try:
        body = json.loads(request.body) if request.body else {}
        account_id = body.get("account_id")
        coefficient_method = body.get("coefficient_method", "balance")  # 'balance' or 'fixed'
        multiplier = body.get("multiplier", 1.0)
        multi_execution = body.get("multi_execution", False)
    except Exception:
        return _error("Invalid JSON body")

    if not account_id:
        return _error("account_id/investment ID is required")

    account = None
    try:
        db_id = int(account_id)
        account = await TradingAccount.filter(
            id=db_id, user_id=user_id, account_type="Investor"
        ).first()
    except ValueError:
        pass

    if not account:
        account = await TradingAccount.filter(
            account_id=str(account_id), user_id=user_id, account_type="Investor"
        ).first()

    if not account:
        return _error("Trading account not found or access denied", status=404)

    try:
        if coefficient_method == "fixed":
            account.copy_mode = "fixed_multiple"
            try:
                val = float(multiplier)
                if val <= 0:
                    return _error("Multiplier must be greater than 0")
                account.copy_factor = val
            except (ValueError, TypeError):
                return _error("Invalid multiplier value")
        else:
            account.copy_mode = "balance"
            account.copy_factor = 1.0

        if multi_execution:
            account.multi_trade_count = max(2, account.multi_trade_count)
        else:
            account.multi_trade_count = 1

        await account.save()
        return JsonResponse(
            {
                "status": "ok",
                "message": "Coefficient configuration deployed successfully",
                "copy_mode": account.copy_mode,
                "copy_factor": float(account.copy_factor)
                if account.copy_factor is not None
                else None,
                "multi_trade_count": account.multi_trade_count,
            }
        )
    except Exception as e:
        return _error(f"Error deploying coefficient configuration: {str(e)}", status=500)
