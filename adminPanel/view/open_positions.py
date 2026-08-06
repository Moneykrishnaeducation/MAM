"""Open Positions view module for adminPanel."""

import logging

from asgiref.sync import async_to_sync
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from adminPanel.models import ClientUser, TradingAccount
from backendPanel.database import ensure_db_initialized

logger = logging.getLogger(__name__)


async def fetch_open_positions_for_account(account_id: int):
    """Fetch open positions for a specific MT5 account ID."""
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
            positions = mt5_actions.get_open_positions(int(account_id))
            mt5_status = "online"
    except Exception as e:
        logger.warning(f"Could not fetch MT5 positions for account {account_id}: {e}")

    return positions, mt5_status


async def fetch_open_positions_for_user(user_id: str):
    """Fetch open positions for all trading accounts belonging to user_id."""
    await ensure_db_initialized()
    positions = []
    user = None
    if user_id.isdigit():
        user = await ClientUser.filter(id=int(user_id)).first()

    if user:
        accounts = await TradingAccount.filter(user_id=user.id).all()
        for acct in accounts:
            if acct.account_id and acct.account_id.isdigit():
                acct_positions, _ = await fetch_open_positions_for_account(int(acct.account_id))
                positions.extend(acct_positions)

    return positions, "online"


@csrf_exempt
def get_admin_open_positions(request, account_id: int):
    """
    GET /api/admin/open-positions/<int:account_id>/
    Fetch open positions for a specific trading account for Admin Panel.
    """
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        logger.info(f"[ADMIN] Fetching open positions for account_id: {account_id}")

        positions, mt5_status = async_to_sync(fetch_open_positions_for_account)(account_id)

        return JsonResponse(
            {
                "success": True,
                "account_id": str(account_id),
                "positions": positions,
                "mt5_status": mt5_status,
            }
        )
    except Exception as e:
        logger.error(f"[ADMIN] Error fetching open positions for account {account_id}: {e}")
        return JsonResponse(
            {
                "success": False,
                "message": str(e),
                "positions": [],
                "mt5_status": "offline",
            },
            status=500,
        )


@csrf_exempt
def get_admin_user_open_positions(request, user_id: str):
    """
    GET /api/admin/users/<str:user_id>/open-positions
    Fetch open positions for all trading accounts belonging to a user.
    """
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        logger.info(f"[ADMIN] Fetching open positions for user_id: {user_id}")

        positions, mt5_status = async_to_sync(fetch_open_positions_for_user)(user_id)

        return JsonResponse(
            {
                "success": True,
                "user_id": str(user_id),
                "positions": positions,
                "mt5_status": mt5_status,
            }
        )
    except Exception as e:
        logger.error(f"[ADMIN] Error fetching open positions for user {user_id}: {e}")
        return JsonResponse(
            {
                "success": False,
                "message": str(e),
                "positions": [],
                "mt5_status": "offline",
            },
            status=500,
        )
