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
    total_equity = sum(account.equity for account in accounts)
    total_allocated = sum(investment.allocated_amount for investment in investments)
    open_tickets = sum(1 for ticket in tickets if str(ticket.status).lower() in {"open", "pending"})
    active_transactions = sum(1 for tx in transactions if str(tx.status).lower() in {"completed", "approved"})

    cards = [
        {
            "key": "balance",
            "title": "Trading Balance",
            "value": _format_currency(total_balance),
            "raw_value": total_balance,
            "subtitle": f"{len(accounts)} account(s) linked",
        },
        {
            "key": "equity",
            "title": "Equity",
            "value": _format_currency(total_equity),
            "raw_value": total_equity,
            "subtitle": "Combined account equity",
        },
        {
            "key": "invested",
            "title": "Allocated Investments",
            "value": _format_currency(total_allocated),
            "raw_value": total_allocated,
            "subtitle": f"{len(investments)} active allocation(s)",
        },
        {
            "key": "activity",
            "title": "Open Tickets",
            "value": str(open_tickets),
            "raw_value": open_tickets,
            "subtitle": f"{active_transactions} completed transaction(s)",
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
            },
        }
    )
