import json
from django.http import JsonResponse
from adminPanel.models import ProfitShareHistory


async def list_admin_profit_share(request):
    try:
        manager_login = request.GET.get("manager_login")
        query = ProfitShareHistory.all()
        if manager_login:
            query = query.filter(master_login=manager_login)
        records = await query.order_by("-created_at").limit(100)

        data = []
        for r in records:
            data.append(
                {
                    "id": r.id,
                    "master_login": r.master_login,
                    "investor_login": r.investor_login,
                    "master_position": r.master_position,
                    "investor_position": r.investor_position,
                    "profit": float(r.profit) if r.profit else 0,
                    "commission_percentage": float(r.commission_percentage)
                    if r.commission_percentage
                    else 0,
                    "commission_amount": float(r.commission_amount) if r.commission_amount else 0,
                    "manager_account": r.manager_account,
                    "investor_account": r.investor_account,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                    "status": r.status,
                }
            )
        return JsonResponse({"status": "success", "data": data})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)
