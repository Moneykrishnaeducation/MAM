import json
from django.http import JsonResponse
from adminPanel.models import ProfitShareHistory, TradingAccount

from clientPanel.view.common import _resolve_client_user_id

async def list_client_profit_share(request):
    try:
        user_id = await _resolve_client_user_id(request)
        if not user_id:
            return JsonResponse({"status": "error", "message": "Unauthorized"}, status=401)
        manager_login = request.GET.get("manager_login")
        
        accounts = await TradingAccount.filter(user_id=user_id).values_list("account_id", flat=True)
        if not accounts:
            return JsonResponse({"status": "success", "data": []})
        
        query = ProfitShareHistory.filter(investor_login__in=accounts)
        if manager_login:
            query = query.filter(master_login=manager_login)
            
        records = await query.order_by("-created_at").limit(50)
        
        data = []
        for r in records:
            data.append({
                "id": r.id,
                "master_login": r.master_login,
                "investor_login": r.investor_login,
                "master_position": r.master_position,
                "investor_position": r.investor_position,
                "profit": float(r.profit) if r.profit else 0,
                "commission_percentage": float(r.commission_percentage) if r.commission_percentage else 0,
                "commission_amount": float(r.commission_amount) if r.commission_amount else 0,
                "manager_account": r.manager_account,
                "investor_account": r.investor_account,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "status": r.status,
            })
        return JsonResponse({"status": "success", "data": data})
    except Exception as e:
        import traceback
        with open("error.log", "a") as f:
            f.write(traceback.format_exc() + "\n")
        return JsonResponse({"status": "error", "message": str(e)}, status=500)
