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

        raw_page = request.GET.get("page")
        raw_per_page = request.GET.get("per_page") or request.GET.get("limit")
        paginate = raw_page is not None or raw_per_page is not None
        
        def _parse_positive_int(val, default):
            try:
                parsed = int(str(val).strip())
                return max(1, parsed)
            except (ValueError, TypeError):
                return default
                
        page = _parse_positive_int(raw_page, 1)
        per_page = _parse_positive_int(raw_per_page, 10)

        logger.info(f"[ADMIN] Fetching closed positions for account_id: {account_id}, {from_date} to {to_date}")

        if from_date and len(from_date) == 10:
            from_date += " 00:00:00"
        if to_date and len(to_date) == 10:
            to_date += " 23:59:59"

        positions, mt5_status = async_to_sync(fetch_closed_positions_for_account)(account_id, from_date, to_date)

        def get_val(obj, keys, default):
            if isinstance(obj, dict):
                for k in keys:
                    if k in obj and obj[k] is not None: return obj[k]
                return default
            else:
                for k in keys:
                    if hasattr(obj, k):
                        val = getattr(obj, k)
                        if val is not None: return val
                return default

        merged_positions = {}
        for p in positions:
            try:
                position_id = str(get_val(p, ["PositionID", "Position"], ""))
                if not position_id or position_id == "0":
                    continue
                    
                entry = int(get_val(p, ["Entry"], 1))
                time_val = get_val(p, ["Time"], 0)
                time_str = datetime.fromtimestamp(time_val).strftime("%Y-%m-%d %H:%M:%S") if time_val else ""
                
                vol_closed = float(get_val(p, ["VolumeClosed"], 0.0))
                vol_base = float(get_val(p, ["Volume"], 0.0))
                raw_volume = vol_closed if vol_closed > 0 else vol_base
                volume = raw_volume if entry in (1, 2, 3) else 0.0
                
                profit = float(get_val(p, ["Profit"], 0.0))
                storage = float(get_val(p, ["Storage", "Swap"], 0.0))
                commission = float(get_val(p, ["Commission"], 0.0))
                
                price_close = float(get_val(p, ["Price"], 0.0))
                price_pos = float(get_val(p, ["PricePosition"], 0.0))
                
                if entry == 0:
                    price_open = price_close
                else:
                    price_open = price_pos if price_pos > 0 else price_close
                
                if position_id in merged_positions:
                    existing = merged_positions[position_id]
                    existing["Volume"] += volume
                    existing["Profit"] += profit
                    existing["Storage"] += storage
                    existing["Commission"] += commission
                    
                    if not existing["TimeClose"] or (time_str and time_str >= existing["TimeClose"]):
                        if entry in (1, 2, 3):
                            existing["TimeClose"] = time_str
                            existing["PriceClose"] = price_close
                            existing["ticket"] = str(get_val(p, ["Deal", "Ticket", "Order"], existing["ticket"]))
                            
                    if not existing["TimeCreate"] or (time_str and time_str <= existing["TimeCreate"]):
                        existing["TimeCreate"] = time_str
                        if price_open > 0:
                            existing["PriceOpen"] = price_open
                else:
                    merged_positions[position_id] = {
                        "ticket": str(get_val(p, ["Deal", "Ticket", "Order"], "")),
                        "PositionID": position_id,
                        "Symbol": str(get_val(p, ["Symbol"], "")),
                        "Action": get_val(p, ["Action"], 0),
                        "Volume": volume,
                        "ContractSize": get_val(p, ["ContractSize"], 0),
                        "PriceOpen": price_open,
                        "PriceClose": price_close if entry in (1, 2, 3) else 0.0,
                        "TimeCreate": time_str,
                        "TimeClose": time_str if entry in (1, 2, 3) else "",
                        "Profit": profit,
                        "Storage": storage,
                        "Commission": commission,
                        "SL": float(get_val(p, ["PriceSL", "SL"], 0.0)),
                        "TP": float(get_val(p, ["PriceTP", "TP"], 0.0)),
                    }
            except Exception as ex:
                logger.warning(f"Error parsing MT5 closed position: {ex}")

        pos_list = []
        for pos in merged_positions.values():
            pos["Volume"] = float(f"{(pos['Volume'] / 10000.0):.2f}")
            pos_list.append(pos)
            
        pos_list.sort(key=lambda x: x["TimeClose"], reverse=True)
        
        total = len(pos_list)
        if paginate:
            total_pages = max(1, (total + per_page - 1) // per_page)
            page = min(page, total_pages) if total > 0 else 1
            start_idx = (page - 1) * per_page
            end_idx = start_idx + per_page
            paginated_list = pos_list[start_idx:end_idx]
        else:
            paginated_list = pos_list
            total_pages = 1
            per_page = total

        return JsonResponse(
            {
                "success": True,
                "account_id": str(account_id),
                "positions": paginated_list,
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": total_pages,
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
