"""Client panel API endpoints: load client user data using central adminPanel models."""

from ninja import Router

router = Router(tags=["client"])


@router.get("/profile")
def get_client_profile(request, user_id: int = 101):
    """Load profile for specific client user only."""
    return {
        "status": "ok",
        "profile": {
            "user_id": user_id,
            "full_name": "Alex Rivera",
            "email": "alex.rivera@example.com",
            "phone": "+1 (555) 019-2834",
            "country": "United States",
            "tier": "VIP Premium",
            "kyc_status": "Verified",
        },
    }


@router.get("/account")
def get_client_account_details(request, user_id: int = 101):
    """Load trading account details for specific client user only."""
    return {
        "status": "ok",
        "account": {
            "user_id": user_id,
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
def get_client_investments(request, user_id: int = 101):
    """Load allocated investments for specific client user only."""
    return {
        "status": "ok",
        "user_id": user_id,
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
def get_client_transactions(request, user_id: int = 101):
    """Load deposit & withdrawal transactions for specific client user only."""
    return {
        "status": "ok",
        "user_id": user_id,
        "transactions": [
            {"id": 1, "type": "Deposit", "amount": 10000.0, "method": "Wire Transfer", "status": "Completed", "date": "2026-07-28"},
            {"id": 2, "type": "Deposit", "amount": 30000.0, "method": "USDT TRC20", "status": "Completed", "date": "2026-07-15"},
            {"id": 3, "type": "Withdrawal", "amount": 2500.0, "method": "Wire Transfer", "status": "Completed", "date": "2026-07-10"},
        ],
    }


@router.get("/tickets")
def get_client_tickets(request, user_id: int = 101):
    """Load support tickets for specific client user only."""
    return {
        "status": "ok",
        "user_id": user_id,
        "tickets": [
            {"id": 101, "subject": "Request leverage change to 1:500", "priority": "Normal", "status": "Closed", "date": "2026-07-20"},
            {"id": 102, "subject": "API Webhook endpoint query", "priority": "High", "status": "Open", "date": "2026-07-31"},
        ],
    }
