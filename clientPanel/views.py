"""Plain async view functions for clientPanel — no router decorators."""

from django.http import JsonResponse

from adminPanel.models import (
    ClientAccount,
    ClientProfile,
    ClientTicket,
    ClientTransaction,
    MyInvestment,
)


async def get_client_profile(request):
    """Load profile for a client user directly from database."""
    user_id = int(request.GET.get("user_id", 0))
    profile = await ClientProfile.filter(user_id=user_id).first()
    if profile is None:
        return JsonResponse({"status": "error", "message": "Profile not found", "profile": None})
    return JsonResponse({
        "status": "ok",
        "profile": {
            "user_id": profile.user_id,
            "full_name": profile.full_name,
            "email": profile.email,
            "phone": profile.phone,
            "country": profile.country,
            "tier": profile.tier,
            "kyc_status": profile.kyc_status,
        },
    })


async def get_client_account(request):
    """Load trading account details for a client user directly from database."""
    user_id = int(request.GET.get("user_id", 0))
    profile = await ClientProfile.filter(user_id=user_id).first()
    if profile is None:
        return JsonResponse({"status": "error", "message": "Profile not found", "account": None})
    account = await ClientAccount.filter(client_profile_id=profile.id).first()
    if account is None:
        return JsonResponse({"status": "error", "message": "Account not found", "account": None})
    return JsonResponse({
        "status": "ok",
        "account": {
            "user_id": user_id,
            "account_number": account.account_number,
            "server": account.server,
            "balance": account.balance,
            "equity": account.equity,
            "margin_free": account.margin_free,
            "leverage": account.leverage,
            "currency": account.currency,
            "status": account.status,
        },
    })


async def get_client_investments(request):
    """Load allocated investments for a client user directly from database."""
    user_id = int(request.GET.get("user_id", 0))
    profile = await ClientProfile.filter(user_id=user_id).first()
    if profile is None:
        return JsonResponse({"status": "ok", "user_id": user_id, "investments": []})
    investments = await MyInvestment.filter(client_profile_id=profile.id).all()
    results = [
        {
            "id": inv.id,
            "strategy": inv.strategy_name,
            "manager": inv.manager_name,
            "allocated": inv.allocated_amount,
            "current_value": inv.current_value,
            "return_pct": inv.return_pct,
            "status": inv.status,
        }
        for inv in investments
    ]
    return JsonResponse({"status": "ok", "user_id": user_id, "investments": results})


async def get_client_transactions(request):
    """Load transactions for a client user directly from database."""
    user_id = int(request.GET.get("user_id", 0))
    profile = await ClientProfile.filter(user_id=user_id).first()
    if profile is None:
        return JsonResponse({"status": "ok", "user_id": user_id, "transactions": []})
    transactions = await ClientTransaction.filter(client_profile_id=profile.id).all()
    results = [
        {
            "id": tx.id,
            "type": tx.transaction_type,
            "amount": tx.amount,
            "method": tx.payment_method,
            "status": tx.status,
            "date": tx.created_at.strftime("%Y-%m-%d") if tx.created_at else None,
        }
        for tx in transactions
    ]
    return JsonResponse({"status": "ok", "user_id": user_id, "transactions": results})


async def get_client_tickets(request):
    """Load support tickets for a client user directly from database."""
    user_id = int(request.GET.get("user_id", 0))
    profile = await ClientProfile.filter(user_id=user_id).first()
    if profile is None:
        return JsonResponse({"status": "ok", "user_id": user_id, "tickets": []})
    tickets = await ClientTicket.filter(client_profile_id=profile.id).all()
    results = [
        {
            "id": t.id,
            "subject": t.subject,
            "priority": t.priority,
            "status": t.status,
            "date": t.created_at.strftime("%Y-%m-%d") if t.created_at else None,
        }
        for t in tickets
    ]
    return JsonResponse({"status": "ok", "user_id": user_id, "tickets": results})
