"""Open Positions view module for clientPanel."""

import logging

from asgiref.sync import async_to_sync
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from adminPanel.models import ClientAccount
from backendPanel.database import ensure_db_initialized

logger = logging.getLogger(__name__)


async def fetch_open_positions(account_id: int):
    """Fetch open positions for a given MT5 account ID."""
    await ensure_db_initialized()
    positions = []
    account_str = str(account_id)

    # Verify trading account exists in database
    account = await ClientAccount.filter(account_number=account_str).first()
    if not account and str(account_id).isdigit():
        account = await ClientAccount.filter(id=int(account_id)).first()

    mt5_status = "offline"
    try:
        from adminPanel.mt5.services import MT5ManagerActions
        mt5_actions = MT5ManagerActions()
        if mt5_actions.manager:
            positions = mt5_actions.get_open_positions(int(account_id))
            mt5_status = "online"
    except Exception as e:
        logger.warning(f"Could not fetch positions via MT5ManagerActions for account {account_id}: {e}")

    return positions, mt5_status


@csrf_exempt
def get_client_open_positions(request, account_id: int):
    """
    GET /api/client/open-positions/<int:account_id>/
    Fetch open positions for a specific trading account by account_id.
    """
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        logger.info(f"Fetching open positions for account_id: {account_id}")

        positions, mt5_status = async_to_sync(fetch_open_positions)(account_id)

        return JsonResponse({
            "success": True,
            "account_id": str(account_id),
            "data": {
                "positions": positions,
                "mt5_status": mt5_status,
            },
            "positions": positions,
            "mt5_status": mt5_status,
        })
    except Exception as e:
        logger.error(f"Error fetching open positions for account {account_id}: {e}")
        return JsonResponse({
            "success": False,
            "message": str(e),
            "positions": [],
            "mt5_status": "offline",
        }, status=500)
