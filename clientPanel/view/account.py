"""Client trading account endpoint."""

import json
import logging

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from adminPanel.models import ClientAccount, ClientUser, TradingAccount
from adminPanel.mt5.services import MT5ManagerActions
from adminPanel.view.mam_accounts import _send_credentials_email
from backendPanel.database import ensure_db_initialized
from backendPanel.permissions import IsClient, permission_required
from clientPanel.view.common import _error, _get_client_profile_for_request, _resolve_client_user_id

logger = logging.getLogger(__name__)


@permission_required(IsClient)
async def get_client_account(request):
    """Load trading account details for a client user directly from database."""
    await ensure_db_initialized()
    profile, error = await _get_client_profile_for_request(request)
    if error:
        return error
    account = await ClientAccount.filter(user_id=profile.id).first()
    if account is None:
        trading_acc = await TradingAccount.filter(user_id=profile.id).first()
        if trading_acc is not None:
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
        else:
            return _error("Account not found", status=404, account=None)
    return JsonResponse(
        {
            "status": "ok",
            "account": {
                "user_id": profile.id,
                "account_number": account.account_number,
                "server": account.server,
                "balance": account.balance,
                "equity": account.equity,
                "margin_free": account.margin_free,
                "leverage": account.leverage,
                "currency": account.currency,
                "status": account.status,
            },
        }
    )


@csrf_exempt
@permission_required(IsClient)
async def create_client_trading_account(request):
    """Create a MAM Master or Investor trading account on MT5 for the client."""
    if request.method != "POST":
        return _error("Only POST method is allowed", status=405)

    await ensure_db_initialized()

    profile, error = await _get_client_profile_for_request(request)
    if error:
        return error

    user_id = await _resolve_client_user_id(request)
    user = await ClientUser.filter(id=user_id).first()
    if not user:
        return _error("Client user not found", status=404)

    try:
        body = json.loads(request.body) if request.body else {}
    except Exception:
        return _error("Invalid JSON body")

    acc_type = body.get("type")
    if not acc_type or acc_type not in ("manager", "master", "investor"):
        return _error("Valid 'type' (manager, master, or investor) is required")

    try:
        mt5 = MT5ManagerActions()
        if mt5.connection_error:
            return _error(f"MT5 Connection failed: {mt5.connection_error}", status=500)
    except Exception as e:
        logger.error(f"MT5 Manager init failed: {e}")
        return _error(f"MT5 Connection failed: {e}", status=500)

    # ── 1. MAM Master Account Creation ──────────────────────────────────────
    if acc_type in ("manager", "master"):
        account_name = body.get("accountName", f"{user.name} MAM Master")
        leverage_str = str(body.get("leverage", "500")).replace("x", "")
        try:
            leverage = int(leverage_str)
        except ValueError:
            leverage = 500

        master_password = body.get("masterPassword")
        investor_password = body.get("investorPassword")

        try:
            profit_share = float(body.get("profitShare", 20))
        except (ValueError, TypeError):
            profit_share = 20.0

        result = mt5.create_mam_account(
            name=user.name,
            email=user.email,
            phone=user.phone or "",
            country=user.country or "United States",
            leverage=leverage,
            master_password=master_password,
            investor_password=investor_password,
            initial_balance=0.0,
            user_id=user.id
        )

        if not result:
            return _error("Failed to create MAM master account on MT5", status=500)

        trading_account = await TradingAccount.get(id=result["trading_account_id"])
        trading_account.account_name = account_name
        trading_account.user = user
        trading_account.profit_sharing_percentage = profit_share
        trading_account.risk_level = body.get("riskLevel", "Medium")
        trading_account.payout_frequency = body.get("payoutFrequency", "Weekly")
        await trading_account.save()

        try:
            await _send_credentials_email(
                user=user,
                account_type="MAM",
                login=result["login"],
                group=result["group"],
                master_password=result.get("master_password"),
                investor_password=result.get("investor_password"),
                account_name=account_name,
                leverage=leverage,
            )
        except Exception as exc:
            logger.error(f"Failed to send client MAM credentials email to {user.email}: {exc}")

        return JsonResponse({
            "status": "ok",
            "message": "MAM master account created successfully",
            "account": {
                "login": result["login"],
                "group": result["group"],
            }
        })

    # ── 2. Investor Account Creation ────────────────────────────────────────
    elif acc_type == "investor":
        manager_acc = body.get("managerAccNumber")
        if not manager_acc:
            return _error("managerAccNumber is required to link the investor to a MAM master strategy")

        mam_master = await TradingAccount.filter(account_id=str(manager_acc), account_type="MAM").first()
        if not mam_master:
            return _error(f"MAM Master account {manager_acc} not found", status=404)

        investment_pwd = body.get("investmentPassword")

        result = mt5.create_investor_account(
            name=user.name,
            email=user.email,
            phone=user.phone or "",
            country=user.country or "United States",
            leverage=mam_master.leverage,
            master_password=None,  # Generates random master password for read-only safety
            investor_password=investment_pwd,
            mam_master_login=int(mam_master.account_id),
            initial_balance=0.0,
            user_id=user.id
        )

        if not result:
            return _error("Failed to create investor account on MT5", status=500)

        trading_account = await TradingAccount.get(id=result["trading_account_id"])
        trading_account.user = user
        trading_account.mam_master_account = mam_master
        await trading_account.save()

        try:
            await _send_credentials_email(
                user=user,
                account_type="Investor",
                login=result["login"],
                group=result["group"],
                master_password=result.get("master_password"),
                investor_password=result.get("investor_password"),
                account_name=f"Investor for {mam_master.account_name or mam_master.account_id}",
                leverage=mam_master.leverage,
            )
        except Exception as exc:
            logger.error(f"Failed to send client investor credentials email to {user.email}: {exc}")

        return JsonResponse({
            "status": "ok",
            "message": "Investor account created successfully",
            "account": {
                "login": result["login"],
                "group": result["group"],
            }
        })
