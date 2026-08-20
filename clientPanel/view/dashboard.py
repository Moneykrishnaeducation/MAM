"""Client dashboard endpoint."""

from django.http import JsonResponse

from adminPanel.models import (
    ActivityLog,
    ClientAccount,
    ClientTicket,
    ClientTransaction,
    MyInvestment,
    TradingAccount,
)
from backendPanel.database import ensure_db_initialized
from backendPanel.permissions import IsClient, permission_required
from clientPanel.view.common import _get_client_profile_for_request


def _format_currency(value: float) -> str:
    return f"${value:,.2f}"
from adminPanel.audit import format_action_name


def _serialize_activity_log(log: ActivityLog) -> dict:
    formatted_action = format_action_name(log.action_type)
    return {
        "id": log.id,
        "action": formatted_action,
        "details": f"{log.module_name}{f' #{log.record_id}' if log.record_id else ''}",
        "user_name": log.user_name,
        "user_role": log.user_role,
        "action_type": formatted_action,
        "module_name": log.module_name,
        "record_id": log.record_id,
        "old_values": log.old_values,
        "new_values": log.new_values,
        "ip_address": log.ip_address,
        "user_agent": log.user_agent,
        "timestamp": log.timestamp.strftime("%Y-%m-%d %H:%M:%S") if log.timestamp else None,
        "time": log.timestamp.strftime("%Y-%m-%d %H:%M:%S") if log.timestamp else None,
    }


@permission_required(IsClient)
async def get_client_dashboard(request):
    """Return client dashboard summary cards and recent activity logs."""
    await ensure_db_initialized()
    profile, error = await _get_client_profile_for_request(request)
    if error:
        return error

    accounts = await ClientAccount.filter(user_id=profile.id).all()
    investments = await MyInvestment.filter(user_id=profile.id).all()
    transactions = await ClientTransaction.filter(user_id=profile.id).order_by("-created_at").all()
    tickets = await ClientTicket.filter(user_id=profile.id).all()
    activity_logs = await ActivityLog.filter(user_id=profile.id).order_by("-timestamp").limit(5)

    total_balance = sum(account.balance for account in accounts)
    total_allocated = sum(investment.allocated_amount for investment in investments)

    my_mam_count = await TradingAccount.filter(user_id=profile.id, account_type="MAM").count()
    my_investor_count = await TradingAccount.filter(
        user_id=profile.id, account_type="Investor"
    ).count()
    all_manager_count = await TradingAccount.filter(account_type="MAM", status="Active").count()

    cards = [
        {
            "key": "manager_account",
            "title": "MAM Manager Account",
            "value": f"{my_mam_count} " if my_mam_count > 0 else "0 ",
            "raw_value": my_mam_count,
        },
        {
            "key": "investor_account",
            "title": "MAM Investor Account",
            "value": f"{my_investor_count} " if my_investor_count > 0 else "0 ",
            "raw_value": my_investor_count,
        },
        {
            "key": "available_managers",
            "title": "Available MAM Managers",
            "value": str(all_manager_count),
            "raw_value": all_manager_count,
            # "subtitle": None,
        },
        {
            "key": "balance",
            "title": "Total Balance",
            "value": _format_currency(total_balance),
            "raw_value": total_balance,
            # "subtitle": f"Account {accounts[0].account_number}" if accounts else None,
        },
    ]

    trading_accounts = await TradingAccount.filter(user_id=profile.id).all()

    # Map raw account numbers to MT5 account IDs if possible
    account_map = {}
    for ca in accounts:
        matching_ta = next((ta for ta in trading_accounts if ta.id == ca.id), None)
        if matching_ta:
            account_map[ca.account_number] = matching_ta.account_id
        else:
            account_map[ca.account_number] = ca.account_number

    for ta in trading_accounts:
        account_map[ta.account_id] = ta.account_id

    # Fallback default
    default_acc_num = list(account_map.values())[0] if account_map else ""

    serialized_txs = []
    for tx in transactions[:5]:  # Get the latest 5 transactions
        raw_acc = tx.account_number
        mapped_acc = account_map.get(raw_acc) if raw_acc else default_acc_num
        serialized_txs.append(
            {
                "id": tx.id,
                "account_number": mapped_acc or raw_acc,
                "type": tx.transaction_type,
                "amount": tx.amount,
                "method": tx.payment_method,
                "status": tx.status,
                "date": tx.created_at.strftime("%Y-%m-%d %H:%M:%S") if tx.created_at else None,
            }
        )

    return JsonResponse(
        {
            "status": "ok",
            "dashboard": {
                "client": {
                    "user_id": profile.id,
                    "full_name": profile.full_name,
                    "email": profile.email,
                    "country": profile.country,
                    "tier": profile.tier,
                    "kyc_status": profile.kyc_status,
                },
                "cards": cards,
                "recent_activity_logs": [_serialize_activity_log(log) for log in activity_logs],
                "recent_transactions": serialized_txs,
                "account": {
                    "user_id": accounts[0].user_id if accounts else profile.id,
                    "account_number": accounts[0].account_number,
                    "server": accounts[0].server,
                    "balance": float(accounts[0].balance),
                    "equity": float(accounts[0].equity),
                    "margin_free": float(accounts[0].margin_free),
                    "leverage": accounts[0].leverage,
                    "currency": accounts[0].currency,
                    "status": accounts[0].status,
                }
                if accounts
                else None,
                "trading_accounts": [
                    {
                        "account_id": acc.account_id,
                        "account_type": acc.account_type,
                        "account_name": acc.account_name,
                        "balance": float(acc.balance),
                        "status": acc.status,
                    }
                    for acc in trading_accounts
                ],
                "investments": [
                    {
                        "id": inv.id,
                        "manager_name": inv.manager_name,
                        "allocated_amount": float(inv.allocated_amount),
                        "status": inv.status,
                    }
                    for inv in investments
                ],
            },
        }
    )
