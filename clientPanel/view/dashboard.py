"""Client dashboard endpoint."""

from django.http import JsonResponse

from adminPanel.models import (
    ActivityLog,
    ClientAccount,
    ClientTicket,
    ClientTransaction,
    MyInvestment,
)
from backendPanel.permissions import IsClient, permission_required
from clientPanel.view.common import _get_client_profile_for_request


def _format_currency(value: float) -> str:
    return f"${value:,.2f}"


def _serialize_activity_log(log: ActivityLog) -> dict:
    return {
        "id": log.id,
        "action": log.action,
        "details": log.details,
        "ip_address": log.ip_address,
        "time": log.created_at.strftime("%Y-%m-%d %H:%M:%S") if log.created_at else None,
    }


@permission_required(IsClient)
async def get_client_dashboard(request):
    """Return client dashboard summary cards and recent activity logs."""
    profile, error = await _get_client_profile_for_request(request)
    if error:
        return error

    accounts = await ClientAccount.filter(client_profile_id=profile.id).all()
    investments = await MyInvestment.filter(client_profile_id=profile.id).all()
    transactions = await ClientTransaction.filter(client_profile_id=profile.id).all()
    tickets = await ClientTicket.filter(client_profile_id=profile.id).all()
    activity_logs = await ActivityLog.filter(user_email__iexact=profile.email).order_by("-created_at").limit(5)

    total_balance = sum(account.balance for account in accounts)
    total_allocated = sum(investment.allocated_amount for investment in investments)
    manager_names = list({inv.manager_name for inv in investments if inv.manager_name})
    manager_name = manager_names[0] if manager_names else "-"
    manager_subtitle = f"{len(manager_names)} linked manager{'s' if len(manager_names) != 1 else ''}" if manager_names else None
    
    cards = [
        {
            "key": "manager_account",
            "title": "MAM Manager Account",
            "value": manager_name,
            "raw_value": manager_name,
            "subtitle": manager_subtitle,
        },
        {
            "key": "funds_invested",
            "title": "MAM Funds Invested",
            "value": _format_currency(total_allocated),
            "raw_value": total_allocated,
            "subtitle": f"{len(investments)} active allocation{'s' if len(investments) != 1 else ''}" if investments else None,
        },
        {
            "key": "balance",
            "title": "MAM Balance",
            "value": _format_currency(total_balance),
            "raw_value": total_balance,
            "subtitle": f"Account {accounts[0].account_number}" if accounts else None,
        },
        {
            "key": "available_managers",
            "title": "Available MAM Managers",
            "value": str(len(manager_names)),
            "raw_value": len(manager_names),
            "subtitle": f"Managers: {', '.join(manager_names)}" if manager_names else None,
        },
    ]

    return JsonResponse(
        {
            "status": "ok",
            "dashboard": {
                "client": {
                    "user_id": profile.user_id,
                    "full_name": profile.full_name,
                    "email": profile.email,
                    "country": profile.country,
                    "tier": profile.tier,
                    "kyc_status": profile.kyc_status,
                },
                "cards": cards,
                "recent_activity_logs": [_serialize_activity_log(log) for log in activity_logs],
                "account": {
                    "user_id": accounts[0].client_profile_id if accounts else profile.id,
                    "account_number": accounts[0].account_number,
                    "server": accounts[0].server,
                    "balance": float(accounts[0].balance),
                    "equity": float(accounts[0].equity),
                    "margin_free": float(accounts[0].margin_free),
                    "leverage": accounts[0].leverage,
                    "currency": accounts[0].currency,
                    "status": accounts[0].status,
                } if accounts else None,
                "investments": [
                    {
                        "id": inv.id,
                        "manager_name": inv.manager_name,
                        "allocated_amount": float(inv.allocated_amount),
                        "status": inv.status,
                    } for inv in investments
                ]
            },
        }
    )
