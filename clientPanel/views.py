"""API views for clientPanel: Profile, Trading Accounts, My Investments, Transactions, Tickets."""

from ninja import Router

router = Router(tags=["client"])


@router.get("/profile")
def get_profile(request):
    """Get client profile data."""
    return {
        "status": "ok",
        "profile": {
            "user_id": 101,
            "full_name": "Alex Rivera",
            "email": "alex.rivera@example.com",
            "phone": "+1 (555) 019-2834",
            "country": "United States",
            "tier": "VIP Premium",
            "kyc_status": "Verified",
        },
    }


@router.get("/account")
def get_account_details(request):
    """Get client trading account details."""
    return {
        "status": "ok",
        "account": {
            "account_number": "MT5-8849201",
            "server": "VTIndex-Live01",
            "balance": 45800.50,
            "equity": 47210.80,
            "margin_free": 38400.00,
            "leverage": "1:500",
            "currency": "USD",
            "status": "Active",
        },
    }


@router.get("/my-investments")
def list_my_investments(request):
    """List client allocated investments."""
    return {
        "status": "ok",
        "investments": [
            {
                "id": 1,
                "strategy": "Alpha Quant Grid",
                "manager": "Alpha Quant Capital",
                "allocated": 25000.0,
                "current_value": 26840.50,
                "return_pct": 7.36,
                "status": "Active",
            },
            {
                "id": 2,
                "strategy": "Gold Index Arbitrage",
                "manager": "Apex Momentum Fund",
                "allocated": 15000.0,
                "current_value": 15920.00,
                "return_pct": 6.13,
                "status": "Active",
            },
        ],
    }


@router.get("/transactions")
def list_transactions(request):
    """List client deposit and withdrawal transactions."""
    return {
        "status": "ok",
        "transactions": [
            {"id": 1, "type": "Deposit", "amount": 10000.0, "method": "Wire Transfer", "status": "Completed", "date": "2026-07-28"},
            {"id": 2, "type": "Deposit", "amount": 30000.0, "method": "USDT TRC20", "status": "Completed", "date": "2026-07-15"},
            {"id": 3, "type": "Withdrawal", "amount": 2500.0, "method": "Wire Transfer", "status": "Completed", "date": "2026-07-10"},
        ],
    }


@router.get("/tickets")
def list_tickets(request):
    """List client support tickets."""
    return {
        "status": "ok",
        "tickets": [
            {"id": 101, "subject": "Request leverage change to 1:500", "priority": "Normal", "status": "Closed", "date": "2026-07-20"},
            {"id": 102, "subject": "API Webhook endpoint query", "priority": "High", "status": "Open", "date": "2026-07-31"},
        ],
    }
