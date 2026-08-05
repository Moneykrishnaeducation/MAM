"""Balance Sync view module for adminPanel & background MT5 balance updates.

The background thread acquires the shared MT5 ManagerAPI object exactly once
(via ``get_shared_manager()`` from services.py) and reuses it for every
5-second sync cycle.  A new connection is NEVER opened inside the loop —
this prevents hitting the MT5 Manager client-connection limit.

If the shared manager becomes unavailable (e.g. the main connection was reset),
the thread backs off and retries acquiring it without creating a new session.
"""

import logging
import threading
from time import sleep

from django.db import close_old_connections, connection
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

logger = logging.getLogger(__name__)

_balance_thread_started = False
_balance_thread_lock = threading.Lock()

# Seconds to wait before retrying when the shared manager is not yet available.
_MANAGER_WAIT_INTERVAL = 10.0
# Maximum consecutive DB errors before we pause and reconnect the DB layer.
_MAX_DB_ERRORS = 5


def _is_manager_alive(manager) -> bool:
    """Quick health check — attempt a lightweight MT5 call to verify the connection."""
    try:
        _ = manager.ServerTime()
        return True
    except Exception:
        return False


def update_account_balances_in_db(manager, target_account_id=None) -> int:
    """
    Fetch live balance/equity/margin from the provided MT5 ManagerAPI object
    and write the values into the 'trading_accounts' PostgreSQL table.

    Args:
        manager: A live MT5 ManagerAPI object (NOT an MT5ManagerActions wrapper).
        target_account_id: Optional single account_id string to restrict the sync.

    Returns:
        Number of accounts successfully updated.
    """
    try:
        close_old_connections()
        connection.ensure_connection()

        # Query trading accounts to sync
        with connection.cursor() as cursor:
            if target_account_id:
                cursor.execute(
                    'SELECT account_id FROM "trading_accounts" WHERE account_id = %s',
                    [str(target_account_id)]
                )
            else:
                cursor.execute(
                    'SELECT account_id FROM "trading_accounts" WHERE account_id IS NOT NULL AND account_id != \'\''
                )
            rows = cursor.fetchall()

        if not rows:
            return 0

        updated_count = 0
        with connection.cursor() as cursor:
            for (acct_id_str,) in rows:
                try:
                    if not str(acct_id_str).isdigit():
                        continue
                    login_id = int(acct_id_str)

                    user_acct = None
                    user_info = None
                    if manager:
                        try:
                            user_acct = manager.UserAccountGet(login_id)
                        except Exception:
                            pass
                        if not user_acct:
                            try:
                                user_info = manager.UserGet(login_id)
                            except Exception:
                                pass

                    if user_acct:
                        balance = float(getattr(user_acct, "Balance", 0.0))
                        equity = float(getattr(user_acct, "Equity", balance))
                        margin = float(getattr(user_acct, "Margin", 0.0))
                        margin_free = float(getattr(user_acct, "MarginFree", 0.0))
                        margin_level = float(getattr(user_acct, "MarginLevel", 0.0))

                        cursor.execute(
                            """
                            UPDATE "trading_accounts"
                            SET balance = %s, equity = %s, margin = %s, margin_free = %s, margin_level = %s
                            WHERE account_id = %s
                            """,
                            [balance, equity, margin, margin_free, margin_level, acct_id_str]
                        )
                        updated_count += 1
                    elif user_info:
                        balance = float(getattr(user_info, "Balance", 0.0))
                        equity = float(getattr(user_info, "Equity", balance))
                        cursor.execute(
                            """
                            UPDATE "trading_accounts"
                            SET balance = %s, equity = %s
                            WHERE account_id = %s
                            """,
                            [balance, equity, acct_id_str]
                        )
                        updated_count += 1
                except Exception as ex:
                    logger.debug(f"[BALANCE-SYNC] Failed updating account {acct_id_str}: {ex}")

        return updated_count
    except Exception as e:
        logger.warning(f"[BALANCE-SYNC] Error in update_account_balances_in_db: {e}")
        return 0


def continuous_balance_updater(interval_seconds: float = 5.0):
    """
    Background thread worker for continuous MT5 balance sync.

    Strategy:
    - Acquire the shared ManagerAPI object once via get_shared_manager().
    - Reuse it for every sync cycle — no new connections are opened.
    - If the manager is not yet available, wait and retry.
    - If the manager becomes unhealthy mid-run, fall back to waiting for a
      fresh one from get_shared_manager() (which reuses the singleton reconnect
      logic in services.py).
    """
    from adminPanel.mt5.services import get_shared_manager

    manager = None
    db_error_count = 0

    while True:
        # ── 1. Ensure we have a live manager ──────────────────────────
        if manager is None:
            manager = get_shared_manager()
            if manager is None:
                # The main connection isn't ready yet — wait quietly.
                sleep(_MANAGER_WAIT_INTERVAL)
                continue

        # ── 2. Health check — reset if the session dropped ────────────
        if not _is_manager_alive(manager):
            logger.warning("[BALANCE-SYNC] Shared MT5 manager appears disconnected. Will retry.")
            manager = None
            sleep(_MANAGER_WAIT_INTERVAL)
            continue

        # ── 3. Sync balances ──────────────────────────────────────────
        try:
            update_account_balances_in_db(manager)
            db_error_count = 0
        except Exception as e:
            db_error_count += 1
            logger.error(f"[BALANCE-SYNC] Thread error ({db_error_count}): {e}")
            if db_error_count >= _MAX_DB_ERRORS:
                logger.warning("[BALANCE-SYNC] Too many consecutive errors. Pausing for 30s.")
                sleep(30)
                db_error_count = 0

        sleep(interval_seconds)


def start_balance_sync_thread(interval_seconds: float = 5.0):
    """Start the balance updater background thread if not already running."""
    global _balance_thread_started
    with _balance_thread_lock:
        if not _balance_thread_started:
            _balance_thread_started = True
            t = threading.Thread(
                target=continuous_balance_updater,
                args=(interval_seconds,),
                daemon=True,
            )
            t.start()


@csrf_exempt
def sync_trading_balances_api(request):
    """
    POST/GET /api/admin/accounts/sync-balances
    Trigger an immediate MT5 balance sync for all trading accounts or a specific account_id.
    Uses the shared manager singleton — does NOT open a new connection.
    """
    if request.method not in ["GET", "POST"]:
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        from adminPanel.mt5.services import get_shared_manager

        account_id = request.GET.get("account_id") or request.POST.get("account_id")
        manager = get_shared_manager()

        if not manager:
            return JsonResponse({
                "success": False,
                "message": "MT5 Manager is not connected yet.",
                "synced_count": 0,
            }, status=503)

        synced_count = update_account_balances_in_db(manager, target_account_id=account_id)

        return JsonResponse({
            "success": True,
            "message": f"Successfully synchronized balances for {synced_count} account(s).",
            "synced_count": synced_count,
        })
    except Exception as e:
        logger.error(f"[ADMIN] Error in sync_trading_balances_api: {e}")
        return JsonResponse({
            "success": False,
            "message": str(e),
            "synced_count": 0,
        }, status=500)
