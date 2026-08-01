"""API views for adminPanel."""

from ninja import Router

router = Router(tags=["admin"])


@router.get("/requests")
def list_pending_requests(request):
    """List pending admin requests."""
    return {
        "status": "ok",
        "requests": [
            {"id": 1, "type": "Deposit Approval", "client": "Alex Rivera", "amount": 5000.0, "status": "Pending"},
            {"id": 2, "type": "Account Allocation", "client": "Sarah Jenkins", "amount": 12500.0, "status": "Pending"},
            {"id": 3, "type": "MAM Allocation", "client": "Marcus Vance", "amount": 50000.0, "status": "Pending"},
            {"id": 4, "type": "Withdrawal Request", "client": "Elena Rostova", "amount": 2500.0, "status": "Pending"},
            {"id": 5, "type": "KYC Verification", "client": "David Chen", "amount": 0.0, "status": "Pending"},
        ],
    }


@router.get("/users")
def list_users(request):
    """List system users."""
    return {
        "status": "ok",
        "users": [
            {"id": 1, "name": "Senior Trader", "email": "senior.trader@vtindex.com", "role": "Trader"},
            {"id": 2, "name": "Risk Analyst", "email": "risk.analyst@vtindex.com", "role": "Analyst"},
        ],
    }


@router.get("/managers")
def list_managers(request):
    """List MAM managers."""
    return {
        "status": "ok",
        "managers": [
            {"id": 1, "name": "Alpha Quant Capital", "strategy": "High-Freq Grid", "aum": 2500000.0, "performance_fee": "20%"},
            {"id": 2, "name": "Apex Momentum Fund", "strategy": "Macro Trend", "aum": 4100000.0, "performance_fee": "15%"},
        ],
    }


@router.get("/investors")
def list_investors(request):
    """List investors."""
    return {
        "status": "ok",
        "investors": [
            {"id": 1, "name": "Alex Rivera", "email": "alex.rivera@example.com", "equity": 45800.5, "status": "Active"},
            {"id": 2, "name": "Sarah Jenkins", "email": "sarah.j@example.com", "equity": 128400.0, "status": "Active"},
        ],
    }


@router.get("/activity")
def list_activity_logs(request):
    """List system activity logs."""
    return {
        "status": "ok",
        "activities": [
            {"id": 1, "action": "HSM Session Verification", "user": "system.admin@vtindex.com", "time": "Just now"},
            {"id": 2, "action": "Equinix NY4 Latency Check (8ms)", "user": "system", "time": "2 mins ago"},
        ],
    }
