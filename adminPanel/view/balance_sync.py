"""Balance Sync view module for adminPanel & background MT5 balance updates."""

import logging
import threading
from time import sleep

from django.db import close_old_connections, connection
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

logger = logging.getLogger(__name__)

_balance_thread_started = False
_balance_thread_lock = threading.Lock()


def update_account_balances_in_db(manager=None, target_account_id=None):
    """
    Fetch live balance, equity, and margin from MT5 Manager (or DB) for trading accounts
    and update the 'trading_accounts' database table.
    """
    try:
        close_old_connections()
        connection.close()
        connection.connect()

        # Ensure Tortoise ORM models are initialized for MT5ManagerActions
        try:
            from asgiref.sync import async_to_sync
            from backendPanel.database import ensure_db_initialized
            async_to_sync(ensure_db_initialized)()
        except Exception:
            pass

        # If manager instance is not passed, attempt to acquire via MT5ManagerActions
        if not manager:
            try:
                from adminPanel.mt5.services import MT5ManagerActions
                actions = MT5ManagerActions()
                if actions.manager:
                    manager = actions.manager
            except Exception as ex:
                logger.debug(f"[BALANCE-SYNC] Could not acquire MT5ManagerActions: {ex}")

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

        if updated_count > 0:
            logger.info(f"[BALANCE-SYNC] Updated balances for {updated_count} account(s) in DB.")
        return updated_count
    except Exception as e:
        logger.warning(f"[BALANCE-SYNC] Error in update_account_balances_in_db: {e}")
        return 0


def continuous_balance_updater(manager=None, interval_seconds=5.0):
    """Background thread worker for continuous MT5 balance sync."""
    logger.info("[BALANCE-SYNC] MT5 Account Balance Sync background thread STARTED (interval=5.0s)")
    print("[BALANCE-SYNC] MT5 Account Balance Sync background thread STARTED (interval=5.0s)")
    while True:
        try:
            update_account_balances_in_db(manager)
        except Exception as e:
            logger.error(f"[BALANCE-SYNC] Thread error: {e}")
        sleep(interval_seconds)


def start_balance_sync_thread(manager=None, interval_seconds=5.0):
    """Start the balance updater thread if not already running."""
    global _balance_thread_started
    with _balance_thread_lock:
        if not _balance_thread_started:
            _balance_thread_started = True
            t = threading.Thread(
                target=continuous_balance_updater,
                args=(manager, interval_seconds),
                daemon=True,
            )
            t.start()
            logger.info("[BALANCE-SYNC] Balance sync thread launched successfully.")


@csrf_exempt
def sync_trading_balances_api(request):
    """
    POST/GET /api/admin/accounts/sync-balances
    Trigger MT5 balance sync for all trading accounts or a specific account_id.
    """
    if request.method not in ["GET", "POST"]:
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        account_id = request.GET.get("account_id") or request.POST.get("account_id")
        logger.info(f"[ADMIN] Triggering balance sync (account_id={account_id})")

        synced_count = update_account_balances_in_db(target_account_id=account_id)

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
