import json
import logging

from backendPanel.mail_queue import queue_email_message
from django.http import JsonResponse
from django.template.loader import render_to_string
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from adminPanel.models import ServerSetting, MT5GroupConfig, TradeGroup, TradingAccount, ClientUser
from adminPanel.mt5.services import MT5ManagerActions
from adminPanel.view.mail import _frontend_base_url
from backendPanel.database import ensure_db_initialized

logger = logging.getLogger(__name__)


# Helper to serialize Decimal/datetime values
def clean_data(val):
    if hasattr(val, "strftime"):
        return val.strftime("%Y-%m-%d %H:%M:%S")
    from decimal import Decimal

    if isinstance(val, Decimal):
        return float(val)
    return val


def _render_credentials_email(
    *,
    user_name: str,
    account_type: str,
    login: str | int,
    group: str,
    account_name: str | None = None,
    leverage: int | None = None,
    master_password: str | None = None,
    investor_password: str | None = None,
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
        "leverage": leverage,
        "master_password": master_password or "",
        "investor_password": investor_password or "",
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
    account_name: str | None = None,
    leverage: int | None = None,
    master_password: str | None = None,
    investor_password: str | None = None,
) -> None:
    subject, plain_body, html_body = _render_credentials_email(
        user_name=user.name or user.email or "there",
        account_type=account_type,
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
        source=f"mt5_{account_type.lower()}_credentials",
        payload={
            "account_type": account_type,
            "login": str(login),
            "group": group,
            "account_name": account_name,
            "leverage": leverage,
        },
    )


# ================= SERVER SETTING CRUD =================


@csrf_exempt
@require_http_methods(["GET", "POST"])
async def server_settings_list_create(request):
    await ensure_db_initialized()
    if request.method == "GET":
        st_param = request.GET.get("server_type")
        if st_param is not None:
            is_real = st_param.lower() in ("true", "1")
            settings = await ServerSetting.filter(server_type=is_real).order_by("-created_at")
        else:
            settings = await ServerSetting.all().order_by("-created_at")
        results = [
            {
                "id": s.id,
                "server_ip": s.server_ip,
                "real_account_login": s.real_account_login,
                "server_name_client": s.server_name_client,
                "server_type": s.server_type,
                "created_at": clean_data(s.created_at),
                "updated_at": clean_data(s.updated_at),
            }
            for s in settings
        ]
        return JsonResponse({"status": "ok", "server_settings": results})

    elif request.method == "POST":
        try:
            body = json.loads(request.body)
            s = await ServerSetting.create(
                server_ip=body.get("server_ip"),
                real_account_login=str(body.get("real_account_login")),
                real_account_password=body.get("real_account_password"),
                server_name_client=body.get("server_name_client"),
                server_type=bool(body.get("server_type", True)),
            )
            return JsonResponse(
                {
                    "status": "ok",
                    "message": "Server setting created successfully",
                    "server_setting": {
                        "id": s.id,
                        "server_ip": s.server_ip,
                        "real_account_login": s.real_account_login,
                        "server_name_client": s.server_name_client,
                        "server_type": s.server_type,
                    },
                },
                status=201,
            )
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=400)


@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
async def server_setting_detail_update_delete(request, pk):
    await ensure_db_initialized()
    setting = await ServerSetting.filter(id=pk).first()
    if not setting:
        return JsonResponse({"status": "error", "message": "Server setting not found"}, status=404)

    if request.method == "GET":
        return JsonResponse(
            {
                "status": "ok",
                "server_setting": {
                    "id": setting.id,
                    "server_ip": setting.server_ip,
                    "real_account_login": setting.real_account_login,
                    "server_name_client": setting.server_name_client,
                    "server_type": setting.server_type,
                    "created_at": clean_data(setting.created_at),
                    "updated_at": clean_data(setting.updated_at),
                },
            }
        )

    elif request.method == "PUT":
        try:
            body = json.loads(request.body)
            if "server_ip" in body:
                setting.server_ip = body["server_ip"]
            if "real_account_login" in body:
                setting.real_account_login = str(body["real_account_login"])
            if "real_account_password" in body:
                setting.real_account_password = body["real_account_password"]
            if "server_name_client" in body:
                setting.server_name_client = body["server_name_client"]
            if "server_type" in body:
                setting.server_type = bool(body["server_type"])
            await setting.save()
            return JsonResponse(
                {
                    "status": "ok",
                    "message": "Server setting updated successfully",
                    "server_setting": {
                        "id": setting.id,
                        "server_ip": setting.server_ip,
                        "real_account_login": setting.real_account_login,
                        "server_name_client": setting.server_name_client,
                        "server_type": setting.server_type,
                    },
                }
            )
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=400)

    elif request.method == "DELETE":
        await setting.delete()
        return JsonResponse({"status": "ok", "message": "Server setting deleted successfully"})


# ================= MT5 GROUP CONFIG CRUD =================


@csrf_exempt
@require_http_methods(["GET", "POST"])
async def group_configs_list_create(request):
    await ensure_db_initialized()
    if request.method == "GET":
        configs = await MT5GroupConfig.all().order_by("group_name")
        results = [
            {
                "id": c.id,
                "group_name": c.group_name,
                "is_demo": c.is_demo,
                "is_enabled": c.is_enabled,
                "leverage": c.leverage,
                "min_deposit": clean_data(c.min_deposit),
                "description": c.description,
                "created_at": clean_data(c.created_at),
                "updated_at": clean_data(c.updated_at),
                "last_sync": clean_data(c.last_sync),
            }
            for c in configs
        ]
        return JsonResponse({"status": "ok", "group_configs": results})

    elif request.method == "POST":
        try:
            body = json.loads(request.body)
            c = await MT5GroupConfig.create(
                group_name=body.get("group_name"),
                is_demo=bool(body.get("is_demo", False)),
                is_enabled=bool(body.get("is_enabled", True)),
                leverage=int(body.get("leverage", 100)),
                min_deposit=float(body.get("min_deposit", 0.0)),
                description=body.get("description", ""),
            )
            return JsonResponse(
                {
                    "status": "ok",
                    "message": "MT5 Group config created successfully",
                    "group_config": {
                        "id": c.id,
                        "group_name": c.group_name,
                        "is_demo": c.is_demo,
                        "is_enabled": c.is_enabled,
                    },
                },
                status=201,
            )
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=400)


@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
async def group_config_detail_update_delete(request, pk):
    await ensure_db_initialized()
    config = await MT5GroupConfig.filter(id=pk).first()
    if not config:
        return JsonResponse({"status": "error", "message": "Group config not found"}, status=404)

    if request.method == "GET":
        return JsonResponse(
            {
                "status": "ok",
                "group_config": {
                    "id": config.id,
                    "group_name": config.group_name,
                    "is_demo": config.is_demo,
                    "is_enabled": config.is_enabled,
                    "leverage": config.leverage,
                    "min_deposit": clean_data(config.min_deposit),
                    "description": config.description,
                    "created_at": clean_data(config.created_at),
                    "updated_at": clean_data(config.updated_at),
                    "last_sync": clean_data(config.last_sync),
                },
            }
        )

    elif request.method == "PUT":
        try:
            body = json.loads(request.body)
            if "group_name" in body:
                config.group_name = body["group_name"]
            if "is_demo" in body:
                config.is_demo = bool(body["is_demo"])
            if "is_enabled" in body:
                config.is_enabled = bool(body["is_enabled"])
            if "leverage" in body:
                config.leverage = int(body["leverage"])
            if "min_deposit" in body:
                config.min_deposit = float(body["min_deposit"])
            if "description" in body:
                config.description = body["description"]
            await config.save()
            return JsonResponse(
                {
                    "status": "ok",
                    "message": "Group config updated successfully",
                    "group_config": {
                        "id": config.id,
                        "group_name": config.group_name,
                        "is_demo": config.is_demo,
                        "is_enabled": config.is_enabled,
                    },
                }
            )
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=400)

    elif request.method == "DELETE":
        await config.delete()
        return JsonResponse({"status": "ok", "message": "Group config deleted successfully"})


# ================= TRADE GROUP CRUD =================


@csrf_exempt
@require_http_methods(["GET", "POST"])
async def trade_groups_list_create(request):
    await ensure_db_initialized()
    if request.method == "GET":
        groups = await TradeGroup.all().order_by("name")
        results = [
            {
                "id": g.id,
                "group_id": g.group_id,
                "name": g.name,
                "description": g.description,
                "alias": g.alias,
                "type": g.type,
                "is_active": g.is_active,
                "is_default": g.is_default,
                "is_demo_default": g.is_demo_default,
                "created_at": clean_data(g.created_at),
                "updated_at": clean_data(g.updated_at),
            }
            for g in groups
        ]
        return JsonResponse({"status": "ok", "trade_groups": results})

    elif request.method == "POST":
        try:
            body = json.loads(request.body)
            is_default = bool(body.get("is_default", False))
            is_demo_default = bool(body.get("is_demo_default", False))
            group_type = body.get("type", "real")

            if is_default and group_type == "real":
                await TradeGroup.filter(is_default=True, type="real").update(is_default=False)
            if is_demo_default and group_type == "demo":
                await TradeGroup.filter(is_demo_default=True, type="demo").update(
                    is_demo_default=False
                )

            g = await TradeGroup.create(
                group_id=body.get("group_id"),
                name=body.get("name"),
                description=body.get("description"),
                alias=body.get("alias"),
                type=group_type,
                is_active=bool(body.get("is_active", True)),
                is_default=is_default,
                is_demo_default=is_demo_default,
            )
            return JsonResponse(
                {
                    "status": "ok",
                    "message": "Trade group created successfully",
                    "trade_group": {
                        "id": g.id,
                        "name": g.name,
                        "type": g.type,
                    },
                },
                status=201,
            )
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=400)


@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
async def trade_group_detail_update_delete(request, pk):
    await ensure_db_initialized()
    group = await TradeGroup.filter(id=pk).first()
    if not group:
        return JsonResponse({"status": "error", "message": "Trade group not found"}, status=404)

    if request.method == "GET":
        return JsonResponse(
            {
                "status": "ok",
                "trade_group": {
                    "id": group.id,
                    "group_id": group.group_id,
                    "name": group.name,
                    "description": group.description,
                    "alias": group.alias,
                    "type": group.type,
                    "is_active": group.is_active,
                    "is_default": group.is_default,
                    "is_demo_default": group.is_demo_default,
                    "created_at": clean_data(group.created_at),
                    "updated_at": clean_data(group.updated_at),
                },
            }
        )

    elif request.method == "PUT":
        try:
            body = json.loads(request.body)
            group_type = body.get("type", group.type)

            if bool(body.get("is_default", False)) and group_type == "real":
                await (
                    TradeGroup.filter(is_default=True, type="real")
                    .exclude(id=pk)
                    .update(is_default=False)
                )
                group.is_default = True
            elif "is_default" in body:
                group.is_default = bool(body["is_default"])

            if bool(body.get("is_demo_default", False)) and group_type == "demo":
                await (
                    TradeGroup.filter(is_demo_default=True, type="demo")
                    .exclude(id=pk)
                    .update(is_demo_default=False)
                )
                group.is_demo_default = True
            elif "is_demo_default" in body:
                group.is_demo_default = bool(body["is_demo_default"])

            if "group_id" in body:
                group.group_id = body["group_id"]
            if "name" in body:
                group.name = body["name"]
            if "description" in body:
                group.description = body["description"]
            if "alias" in body:
                group.alias = body["alias"]
            if "type" in body:
                group.type = body["type"]
            if "is_active" in body:
                group.is_active = bool(body["is_active"])

            await group.save()
            return JsonResponse(
                {
                    "status": "ok",
                    "message": "Trade group updated successfully",
                    "trade_group": {
                        "id": group.id,
                        "name": group.name,
                        "type": group.type,
                    },
                }
            )
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=400)

    elif request.method == "DELETE":
        await group.delete()
        return JsonResponse({"status": "ok", "message": "Trade group deleted successfully"})


# ================= MAM ACCOUNT CRUD =================


@csrf_exempt
@require_http_methods(["GET", "POST"])
async def mam_accounts_list_create(request):
    await ensure_db_initialized()
    if request.method == "GET":
        accounts = await TradingAccount.filter(account_type="MAM").order_by("-created_at")
        results = [
            {
                "id": a.id,
                "account_number": a.account_id,
                "broker": "Equinix Direct",
                "master_strategy": "Quantitative Grid",
                "leverage": f"1:{a.leverage}",
                "total_balance": clean_data(a.balance),
                "status": a.status or "Active",
                "created_at": clean_data(a.created_at),
            }
            for a in accounts
        ]
        return JsonResponse({"status": "ok", "mam_accounts": results})

    elif request.method == "POST":
        try:
            body = json.loads(request.body)
            # Default to first user if none supplied since user_id is required
            first_user = await ClientUser.first()
            if not first_user:
                return JsonResponse(
                    {"status": "error", "message": "No client user exists to own the MAM account"},
                    status=400,
                )

            try:
                lev = int(str(body.get("leverage", "500")).split(":")[-1])
            except Exception:
                lev = 500

            a = await TradingAccount.create(
                account_id=body.get("account_number"),
                account_type="MAM",
                account_name=body.get("account_number", "MAM Master"),
                user=first_user,
                leverage=lev,
                balance=float(body.get("total_balance", 0.0)),
                equity=float(body.get("total_balance", 0.0)),
                margin=0,
                margin_free=0,
                margin_level=0,
                is_enabled=True,
                is_trading_enabled=True,
                is_algo_enabled=False,
                is_pending=False,
                manager_allow_copy=True,
                investor_allow_copy=False,
                copy_trade_enabled=False,
                dual_trade_enabled=False,
                copy_multiplier_mode="Fixed",
                status=body.get("status", "Active"),
            )
            return JsonResponse(
                {
                    "status": "ok",
                    "message": "MAM account created successfully",
                    "mam_account": {
                        "id": a.id,
                        "account_number": a.account_id,
                        "status": a.status,
                    },
                },
                status=201,
            )
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=400)


@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
async def mam_account_detail_update_delete(request, pk):
    await ensure_db_initialized()
    account = await TradingAccount.filter(id=pk, account_type="MAM").first()
    if not account:
        return JsonResponse({"status": "error", "message": "MAM account not found"}, status=404)

    if request.method == "GET":
        return JsonResponse(
            {
                "status": "ok",
                "mam_account": {
                    "id": account.id,
                    "account_number": account.account_id,
                    "broker": "Equinix Direct",
                    "master_strategy": "Quantitative Grid",
                    "leverage": f"1:{account.leverage}",
                    "total_balance": clean_data(account.balance),
                    "status": account.status or "Active",
                    "created_at": clean_data(account.created_at),
                },
            }
        )

    elif request.method == "PUT":
        try:
            body = json.loads(request.body)
            if "account_number" in body:
                account.account_id = body["account_number"]
            if "leverage" in body:
                try:
                    account.leverage = int(str(body["leverage"]).split(":")[-1])
                except Exception:
                    pass
            if "total_balance" in body:
                account.balance = float(body["total_balance"])
            if "status" in body:
                account.status = body["status"]
            await account.save()
            return JsonResponse(
                {
                    "status": "ok",
                    "message": "MAM account updated successfully",
                    "mam_account": {
                        "id": account.id,
                        "account_number": account.account_id,
                        "status": account.status,
                    },
                }
            )
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=400)

    elif request.method == "DELETE":
        await account.delete()
        return JsonResponse({"status": "ok", "message": "MAM account deleted successfully"})


# ================= INVESTOR (MAM INVESTOR) CRUD =================


@csrf_exempt
@require_http_methods(["GET", "POST"])
async def investors_list_create(request):
    await ensure_db_initialized()
    if request.method == "GET":
        investors = (
            await TradingAccount.filter(account_type="Investor")
            .prefetch_related("user", "mam_master_account")
            .order_by("-created_at")
        )
        results = [
            {
                "id": i.id,
                "name": i.user.name if i.user else "Investor User",
                "email": i.user.email if i.user else "investor@mam.com",
                "account_number": i.account_id,
                "equity": clean_data(i.equity),
                "allocated_mam": i.mam_master_account.account_id if i.mam_master_account else None,
                "status": i.status or "Active",
                "created_at": clean_data(i.created_at),
            }
            for i in investors
        ]
        return JsonResponse({"status": "ok", "investors": results})

    elif request.method == "POST":
        try:
            body = json.loads(request.body)
            first_user = await ClientUser.first()
            if not first_user:
                return JsonResponse(
                    {
                        "status": "error",
                        "message": "No client user exists to own the Investor account",
                    },
                    status=400,
                )

            mam_master = None
            manager_acc = (
                body.get("managerAccNumber")
                or body.get("manager_account_id")
                or body.get("manager_id")
            )
            allocated_mam = body.get("allocated_mam") or manager_acc
            if allocated_mam:
                mam_master = (
                    await TradingAccount.filter(
                        account_id=str(allocated_mam), account_type="MAM"
                    ).first()
                    or await TradingAccount.filter(id=allocated_mam, account_type="MAM").first()
                )

            try:
                mt5 = MT5ManagerActions()
                if mt5.connection_error:
                    return JsonResponse(
                        {
                            "status": "error",
                            "message": f"MT5 Connection failed: {mt5.connection_error}",
                        },
                        status=500,
                    )
            except Exception as exc:
                logger.error(f"MT5 Manager init failed: {exc}")
                return JsonResponse(
                    {"status": "error", "message": f"MT5 Connection failed: {exc}"}, status=500
                )

            account_name = body.get("name", "MAM Investor")
            leverage_value = mam_master.leverage if mam_master else body.get("leverage", 100)
            try:
                leverage = int(str(leverage_value).replace("x", ""))
            except (ValueError, TypeError):
                leverage = 100

            investor_password = (
                body.get("investmentPassword")
                or body.get("password")
                or body.get("investorPassword")
            )
            result = mt5.create_investor_account(
                name=first_user.name,
                email=first_user.email,
                phone=first_user.phone or "",
                country=first_user.country or "United States",
                leverage=leverage,
                master_password=None,
                investor_password=investor_password,
                mam_master_login=int(mam_master.account_id)
                if mam_master and str(mam_master.account_id).isdigit()
                else None,
                initial_balance=float(body.get("equity", 0.0)),
                allocated_mam=mam_master.id if mam_master else None,
                user_id=first_user.id,
            )

            if not result:
                return JsonResponse(
                    {"status": "error", "message": "Failed to create investor account on MT5"},
                    status=500,
                )

            i = await TradingAccount.get(id=result["trading_account_id"])
            i.account_name = account_name
            i.user = first_user
            if mam_master:
                i.mam_master_account = mam_master
                if not i.leverage:
                    i.leverage = mam_master.leverage
            i.status = body.get("status", i.status or "Active")
            if "equity" in body:
                i.balance = float(body.get("equity", 0.0))
                i.equity = float(body.get("equity", 0.0))
            await i.save()

            try:
                await _send_credentials_email(
                    user=first_user,
                    account_type="Investor",
                    login=result["login"],
                    group=result["group"],
                    account_name=account_name,
                    leverage=leverage,
                    master_password=result.get("master_password"),
                    investor_password=result.get("investor_password"),
                )
            except Exception as exc:
                logger.error(
                    f"Failed to send investor credentials email to {first_user.email}: {exc}"
                )

            return JsonResponse(
                {
                    "status": "ok",
                    "message": "MAM Investor created successfully",
                    "investor": {
                        "id": i.id,
                        "name": i.account_name,
                        "account_number": result["login"],
                        "status": i.status,
                        "allocated_mam": mam_master.account_id if mam_master else None,
                    },
                },
                status=201,
            )
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=400)


@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
async def investor_detail_update_delete(request, pk):
    await ensure_db_initialized()
    investor = (
        await TradingAccount.filter(id=pk, account_type="Investor")
        .prefetch_related("user", "mam_master_account")
        .first()
    )
    if not investor:
        return JsonResponse({"status": "error", "message": "MAM Investor not found"}, status=404)

    if request.method == "GET":
        return JsonResponse(
            {
                "status": "ok",
                "investor": {
                    "id": investor.id,
                    "name": investor.user.name if investor.user else "Investor User",
                    "email": investor.user.email if investor.user else "investor@mam.com",
                    "account_number": investor.account_id,
                    "equity": clean_data(investor.equity),
                    "allocated_mam": investor.mam_master_account.account_id
                    if investor.mam_master_account
                    else None,
                    "status": investor.status or "Active",
                    "created_at": clean_data(investor.created_at),
                },
            }
        )

    elif request.method == "PUT":
        try:
            body = json.loads(request.body)
            if "name" in body and investor.user:
                investor.user.name = body["name"]
                await investor.user.save()
            if "email" in body and investor.user:
                investor.user.email = body["email"]
                await investor.user.save()
            if "account_number" in body:
                investor.account_id = body["account_number"]
            if "equity" in body:
                investor.equity = float(body["equity"])
                investor.balance = float(body["equity"])
            if "allocated_mam" in body:
                mam_master = await TradingAccount.filter(
                    account_id=str(body["allocated_mam"]), account_type="MAM"
                ).first()
                if mam_master:
                    investor.mam_master_account = mam_master
            if "status" in body:
                investor.status = body["status"]
            await investor.save()
            return JsonResponse(
                {
                    "status": "ok",
                    "message": "MAM Investor updated successfully",
                    "investor": {
                        "id": investor.id,
                        "name": investor.user.name if investor.user else "Investor User",
                        "account_number": investor.account_id,
                        "status": investor.status,
                    },
                }
            )
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=400)

    elif request.method == "DELETE":
        await investor.delete()
        return JsonResponse({"status": "ok", "message": "MAM Investor deleted successfully"})


# ================= SYNC GROUPS FROM MT5 =================


@csrf_exempt
@require_http_methods(["POST"])
async def sync_groups_from_mt5(request):
    """Trigger synchronization of MT5 groups into the database."""
    try:
        await ensure_db_initialized()
        from adminPanel.mt5.services import MT5ManagerActions

        is_real = True
        st_param = request.GET.get("server_type")
        if st_param is not None:
            is_real = st_param.lower() in ("true", "1")
        else:
            try:
                body = json.loads(request.body) if request.body else {}
                if "server_type" in body:
                    is_real = bool(body["server_type"])
            except Exception:
                pass

        mt5_actions = MT5ManagerActions(server_type=is_real)

        if mt5_actions.connection_error:
            return JsonResponse(
                {
                    "status": "error",
                    "message": f"MT5 connection failed: {mt5_actions.connection_error}",
                },
                status=500,
            )

        success = mt5_actions.sync_mt5_groups()
        if success:
            return JsonResponse(
                {"status": "ok", "message": "Groups synchronized from MT5 successfully"}
            )
        else:
            return JsonResponse(
                {"status": "error", "message": "Failed to synchronize groups from MT5 manager"},
                status=500,
            )
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)
