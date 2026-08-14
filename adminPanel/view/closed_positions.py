"""Closed Positions view module for adminPanel."""

import logging
from datetime import datetime, timedelta

from asgiref.sync import async_to_sync
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from adminPanel.models import ClientUser, TradingAccount
from backendPanel.database import ensure_db_initialized

logger = logging.getLogger(__name__)


async def fetch_closed_positions_for_account(account_id: int, from_date: str = None, to_date: str = None):
    """Fetch closed positions for a specific MT5 account ID."""
    await ensure_db_initialized()
    positions = []
    account_str = str(account_id)

    # Check if trading account exists
    account = await TradingAccount.filter(account_id=account_str).first()
    if not account and str(account_id).isdigit():
        account = await TradingAccount.filter(id=int(account_id)).first()

    mt5_status = "offline"
    try:
        from adminPanel.mt5.services import MT5ManagerActions

        mt5_actions = MT5ManagerActions()
        if mt5_actions.manager:
            if not from_date or not to_date:
                # Default to 7 days
                to_dt = datetime.now()
                from_dt = to_dt - timedelta(days=7)
                from_date = from_dt.strftime("%Y-%m-%d %H:%M:%S")
                to_date = to_dt.strftime("%Y-%m-%d %H:%M:%S")
            positions = mt5_actions.get_closed_trades(int(account_id), from_date, to_date)
            mt5_status = "online"
    except Exception as e:
        logger.warning(f"Could not fetch MT5 closed positions for account {account_id}: {e}")

    return positions, mt5_status


@csrf_exempt
def get_admin_closed_positions(request, account_id: int):
    """
    GET /api/admin/closed-positions/<int:account_id>/
    Fetch closed positions for a specific trading account for Admin Panel.
    Query params: from_date, to_date (YYYY-MM-DD)
    """
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        from_date = request.GET.get("from_date")
        to_date = request.GET.get("to_date")

        logger.info(f"[ADMIN] Fetching closed positions for account_id: {account_id}, {from_date} to {to_date}")

        if from_date and len(from_date) == 10:
            from_date += " 00:00:00"
        if to_date and len(to_date) == 10:
            to_date += " 23:59:59"

        positions, mt5_status = async_to_sync(fetch_closed_positions_for_account)(account_id, from_date, to_date)

        # convert the object to dict if it's not already
        pos_list = []
        for p in positions:
            if hasattr(p, '__dict__'):
                pos_list.append(p.__dict__)
            elif type(p) is dict:
                pos_list.append(p)
            else:
                pos_list.append(str(p))

        return JsonResponse(
            {
                "success": True,
                "account_id": str(account_id),
                "positions": pos_list,
                "mt5_status": mt5_status,
            }
        )
    except Exception as e:
        logger.error(f"[ADMIN] Error fetching closed positions for account {account_id}: {e}")
        return JsonResponse(
            {
                "success": False,
                "message": str(e),
                "positions": [],
                "mt5_status": "offline",
            },
            status=500,
        )
