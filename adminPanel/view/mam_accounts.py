"""MAM and Investor account creation API via MT5 integration."""

import json
import logging

from backendPanel.mail_queue import queue_email_message
from django.http import JsonResponse
from django.template.loader import render_to_string
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from adminPanel.models import ClientUser, TradingAccount
from adminPanel.mt5.services import MT5ManagerActions
from backendPanel.permissions import IsAdmin, permission_required
from adminPanel.view.mail import _frontend_base_url

logger = logging.getLogger(__name__)


def _render_credentials_email_body(
    *,
    user_name: str,
    account_type: str,
    login: str | int,
    group: str,
    master_password: str | None = None,
    investor_password: str | None = None,
    account_name: str | None = None,
    leverage: int | None = None,
) -> tuple[str, str, str]:
    display_account_type = "MAM" if account_type.strip().lower() == "mam" else account_type.title()
    template_prefix = (
        "mam_credentials_email" if display_account_type == "MAM" else "investor_credentials_email"
    )
    context = {
        "user_name": user_name or "there",
        "account_type": display_account_type,
        "account_name": account_name or "",
        "login": str(login),
        "group": group,
        "master_password": master_password or "",
        "investor_password": investor_password or "",
        "leverage": leverage,
        "frontend_base_url": _frontend_base_url(),
    }

    subject = f"{display_account_type} account credentials"
    plain_body = render_to_string(f"emails/{template_prefix}.txt", context).strip()
    html_body = render_to_string(f"emails/{template_prefix}.html", context)
    return subject, plain_body, html_body


async def _send_credentials_email(
    *,
    user: ClientUser,
    account_type: str,
    login: str | int,
    group: str,
    master_password: str | None = None,
    investor_password: str | None = None,
    account_name: str | None = None,
    leverage: int | None = None,
) -> None:
    subject, plain_body, html_body = _render_credentials_email_body(
        user_name=user.name or user.email or "there",
        account_type=account_type,
        login=login,
        group=group,
        master_password=master_password,
        investor_password=investor_password,
        account_name=account_name,
        leverage=leverage,
    )
    await queue_email_message(
        subject=subject,
        body=plain_body,
        html_body=html_body,
        to=[user.email],
        source=f"mt5_{account_type.lower()}_credentials",
        payload={
            "account_type": account_type,
            "login": str(login),
            "group": group,
            "account_name": account_name,
            "leverage": leverage,
        },
    )


@csrf_exempt
@permission_required(IsAdmin)
@require_http_methods(["POST"])
async def create_account_api(request):
    """
    Unified API to create a MAM or Investor account with MT5 integration.
    """
    try:
        body = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"status": "error", "message": "Invalid JSON body"}, status=400)

    acc_type = body.get("type")  # "manager" | "investor"
    user_id_str = body.get("userId")  # "USR-XXX" or database pk

    if not acc_type or not user_id_str:
        return JsonResponse(
            {"status": "error", "message": "type and userId are required"}, status=400
        )

    # Resolve user
    user = None
    if str(user_id_str).startswith("USR-"):
        try:
            pk_val = int(user_id_str.split("-")[1])
            user = await ClientUser.filter(id=pk_val).first()
        except (ValueError, IndexError):
            pass
    if not user:
        try:
            user = await ClientUser.filter(id=int(user_id_str)).first()
        except (ValueError, TypeError):
            pass
    if not user:
        user = await ClientUser.filter(user_code=user_id_str).first()

    if not user:
        return JsonResponse({"status": "error", "message": "Client user not found"}, status=404)

    try:
        mt5 = MT5ManagerActions()
    except Exception as e:
        logger.error(f"MT5 Manager init failed: {e}")
        return JsonResponse(
            {"status": "error", "message": f"MT5 connection failed: {e}"}, status=500
        )

    if acc_type == "manager" or acc_type == "master":
        account_name = body.get("accountName", f"{user.name} MAM Master")
        leverage_str = body.get("leverage", "500x").replace("x", "")
        try:
            leverage = int(leverage_str)
        except ValueError:
            leverage = 500

        master_password = body.get("masterPassword")
        investor_password = body.get("investorPassword")
        agent = body.get("agent")
        try:
            agent_id = int(agent) if agent else 0
        except (ValueError, TypeError):
            agent_id = 0

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
            user_id=user.id,
            agent=agent_id,
        )

        if not result:
            return JsonResponse(
                {"status": "error", "message": "Failed to create MAM account on MT5"}, status=500
            )

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
            logger.error(f"Failed to send MAM credentials email to {user.email}: {exc}")

        return JsonResponse(
            {
                "status": "ok",
                "message": "MAM master account created successfully",
                "account": {
                    "login": result["login"],
                    "group": result["group"],
                },
            }
        )

    elif acc_type == "investor":
        manager_acc = body.get("managerAccNumber")
        mam_master = await TradingAccount.filter(
            account_id=str(manager_acc), account_type="MAM"
        ).first()
        if not mam_master:
            return JsonResponse(
                {"status": "error", "message": f"MAM Master account {manager_acc} not found"},
                status=404,
            )

        investment_pwd = body.get("investmentPassword")

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
            return JsonResponse(
                {"status": "error", "message": "Failed to create investor account on MT5"},
                status=500,
            )

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
            logger.error(f"Failed to send investor credentials email to {user.email}: {exc}")

        return JsonResponse(
            {
                "status": "ok",
                "message": "Investor account created successfully",
                "account": {
                    "login": result["login"],
                    "group": result["group"],
                },
            }
        )

    else:
        return JsonResponse(
            {"status": "error", "message": "Invalid account type specifier"}, status=400
        )
