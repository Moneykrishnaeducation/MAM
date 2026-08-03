"""Admin dashboard endpoint."""

from __future__ import annotations

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from adminPanel.models import (
    ActivityLog,
    ClientUser,
    Investor,
    MamAccount,
    Manager,
    PendingRequest,
)
from backendPanel.permissions import IsAdmin, permission_required


def _format_currency(value: float) -> str:
    return f"${value:,.2f}"


def _format_timestamp(value) -> str | None:
    return value.strftime("%Y-%m-%d %H:%M:%S") if value else None


def _dashboard_card(
    key: str,
    title: str,
    value: str,
    change: str,
    icon: str,
    color: str,
    bg: str,
    is_positive: bool = True,
) -> dict:
    return {
        "key": key,
        "title": title,
        "value": value,
        "change": change,
        "isPositive": is_positive,
        "icon": icon,
        "color": color,
        "bg": bg,
    }


@permission_required(IsAdmin)
@require_http_methods(["GET"])
async def get_admin_dashboard(request):
    """Return the summary data used by the admin dashboard UI."""

    managers = await Manager.all()
    investors = await Investor.all()
    mam_accounts = await MamAccount.all()
    admin_users = await ClientUser.filter(role__iexact="admin").all()
    client_users = await ClientUser.exclude(role__iexact="admin").all()
    pending_requests = await PendingRequest.all().order_by("-created_at").limit(5)
    pending_count = await PendingRequest.filter(status__iexact="pending").count()
    recent_activity_logs = await ActivityLog.all().order_by("-created_at").limit(5)
    recent_clients = await ClientUser.exclude(role__iexact="admin").order_by("-joined").limit(5)

    total_aum = sum(manager.total_aum for manager in managers)
    total_managed_balance = sum(account.total_balance for account in mam_accounts)
    if total_aum == 0:
        total_aum = total_managed_balance

    active_accounts = sum(
        1 for account in mam_accounts if str(account.status).strip().lower() in {"active", "operational"}
    )

    cards = [
        _dashboard_card(
            key="investors",
            title="Total MAM Investors",
            value=str(len(investors)),
            change=f"{len(client_users)} client user(s) registered",
            icon="Users",
            color="text-blue-400",
            bg="bg-blue-500/10 border-blue-500/20",
        ),
        _dashboard_card(
            key="accounts",
            title="Active MAM Accounts",
            value=str(active_accounts),
            change=f"{len(mam_accounts)} account(s) total",
            icon="TrendingUp",
            color="text-purple-400",
            bg="bg-purple-500/10 border-purple-500/20",
        ),
        _dashboard_card(
            key="aum",
            title="Total AUM (Assets)",
            value=_format_currency(total_aum),
            change=f"{len(managers)} manager(s) assigned",
            icon="DollarSign",
            color="text-emerald-400",
            bg="bg-emerald-500/10 border-emerald-500/20",
        ),
        _dashboard_card(
            key="uptime",
            title="MT5 Server Status",
            value="99.9%",
            change="Optimal Latency",
            icon="Activity",
            color="text-amber-400",
            bg="bg-amber-500/10 border-amber-500/20",
        ),
    ]

    return JsonResponse(
        {
            "status": "ok",
            "dashboard": {
                "cards": cards,
                "summary": {
                    "admin_users": len(admin_users),
                    "client_users": len(client_users),
                    "managers": len(managers),
                    "investors": len(investors),
                    "mam_accounts": len(mam_accounts),
                    "pending_requests": pending_count,
                    "total_aum": total_aum,
                },
                "recent_registrations": [
                    {
                        "id": user.user_code or f"USR-{user.id:03d}",
                        "name": user.name,
                        "email": user.email,
                        "country": user.country,
                        "status": user.status,
                        "verified": user.verified,
                        "joined": _format_timestamp(user.joined),
                        "avatar": user.avatar,
                    }
                    for user in recent_clients
                ],
                "recent_requests": [
                    {
                        "id": request.id,
                        "type": request.request_type,
                        "client": request.client_name,
                        "amount": request.amount,
                        "status": request.status,
                        "created_at": _format_timestamp(request.created_at),
                    }
                    for request in pending_requests
                ],
                "recent_activity_logs": [
                    {
                        "id": log.id,
                        "action": log.action,
                        "user": log.user_email,
                        "ip_address": log.ip_address,
                        "details": log.details,
                        "time": _format_timestamp(log.created_at),
                    }
                    for log in recent_activity_logs
                ],
                "quick_actions": [
                    {"label": "Add User", "href": "/admin/activity", "icon": "UserPlus"},
                    {"label": "Create Admin User", "href": "/admin/admin-users", "icon": "PlusCircle"},
                    {"label": "View Logs", "href": "/admin/activity", "icon": "FileText"},
                    {"label": "System Config", "href": "/admin/settings", "icon": "Settings"},
                ],
                "system_health": {
                    "status": "Live",
                    "api_server_response_ms": 18,
                    "database_load_pct": 32,
                    "uptime_percent": 99.9,
                },
            },
        }
    )
