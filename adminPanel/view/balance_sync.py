"""Balance Sync view module — background MT5 balance updates.

Architecture contract
─────────────────────
- The shared ManagerAPI object is owned and kept alive by services.py.
- This module NEVER creates a new MT5ManagerActions() or calls
  get_manager_instance() — it only reads the already-connected object via
  get_shared_manager().
- All raw MT5 SDK calls are serialised under the module-level RLock exposed
  by get_mt5_api_lock(), because the C-extension is not documented as
  thread-safe.
- Reconnect logic stays entirely inside services.py.  If the connection
  drops, this thread backs off and waits for the singleton to recover.
"""

import logging
import threading
from contextvars import copy_context
from time import sleep

from django.db import close_old_connections, connection
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

logger = logging.getLogger(__name__)

_balance_thread_started = False
_balance_thread_lock = threading.Lock()

# Seconds to wait when the shared manager is not yet ready or has dropped.
_MANAGER_WAIT_INTERVAL = 10.0
# Consecutive DB-layer errors before a 30-second cooldown pause.
_MAX_DB_ERRORS = 5


# ─── Health check ────────────────────────────────────────────────────────────


def _is_manager_alive(manager, mt5_lock: threading.RLock) -> bool:
    """
    Lightweight liveness probe for the shared ManagerAPI connection.

    Uses GroupTotal() — the cheapest read-only MT5 call available on an
    unconnected ManagerAPI object.  Returns True only when the call succeeds
    with a sensible integer result (>= 0).
    """
    if not manager:
        return False
    try:
        with mt5_lock:
            total = manager.GroupTotal()
        # In Python, isinstance(False, int) is True — explicitly disallow bool
        if isinstance(total, bool) or not isinstance(total, int):
            logger.warning(
                f"[BALANCE-SYNC] Health check failed: GroupTotal() returned non-int {total!r}"
            )
            return False
        return total >= 0
    except Exception as exc:
        logger.warning(f"[BALANCE-SYNC] Health check exception: {exc}")
        return False


# ─── Core sync function ───────────────────────────────────────────────────────


def update_account_balances_in_db(
    manager, mt5_lock: threading.RLock, target_account_id=None
) -> int:
    """
    Fetch live balance/equity/margin from the provided MT5 ManagerAPI object
    and write the values into the 'trading_accounts' PostgreSQL table.

    Args:
        manager:           A live MT5 ManagerAPI object (NOT MT5ManagerActions).
        mt5_lock:          The RLock from get_mt5_api_lock() — must be held
                           for every raw MT5 call.
        target_account_id: Optional account_id string to restrict the sync.

    Returns:
        Number of accounts successfully updated.
    """
    try:
        close_old_connections()
        connection.ensure_connection()

        # Fetch the list of account IDs to sync.
        with connection.cursor() as cursor:
            if target_account_id:
                cursor.execute(
                    'SELECT account_id FROM "trading_accounts" WHERE account_id = %s',
                    [str(target_account_id)],
                )
            else:
                cursor.execute(
                    'SELECT account_id FROM "trading_accounts"'
                    " WHERE account_id IS NOT NULL AND account_id != ''"
                )
            rows = cursor.fetchall()

        if not rows:
            logger.debug("[BALANCE-SYNC] No trading accounts found in DB to sync.")
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

                    # ── All MT5 API calls under the shared lock ───────
                    with mt5_lock:
                        try:
                            user_acct = manager.UserAccountGet(login_id)
                        except Exception as ex:
                            logger.debug(f"[BALANCE-SYNC] UserAccountGet({login_id}) failed: {ex}")
                        if not user_acct:
                            try:
                                user_info = manager.UserGet(login_id)
                            except Exception as ex:
                                logger.debug(f"[BALANCE-SYNC] UserGet({login_id}) failed: {ex}")

                    if user_acct and not isinstance(user_acct, bool):
                        balance = float(getattr(user_acct, "Balance", 0.0))
                        equity = float(getattr(user_acct, "Equity", balance))
                        margin = float(getattr(user_acct, "Margin", 0.0))
                        margin_free = float(getattr(user_acct, "MarginFree", 0.0))
                        margin_level = float(getattr(user_acct, "MarginLevel", 0.0))

                        cursor.execute(
                            """
                            UPDATE "trading_accounts"
                            SET balance = %s, equity = %s, margin = %s,
                                margin_free = %s, margin_level = %s
                            WHERE account_id = %s
                            """,
                            [balance, equity, margin, margin_free, margin_level, acct_id_str],
                        )
                        updated_count += 1
                    elif user_info and not isinstance(user_info, bool):
                        balance = float(getattr(user_info, "Balance", 0.0))
                        equity = float(getattr(user_info, "Equity", balance))
                        cursor.execute(
                            """
                            UPDATE "trading_accounts"
                            SET balance = %s, equity = %s
                            WHERE account_id = %s
                            """,
                            [balance, equity, acct_id_str],
                        )
                        updated_count += 1
                    else:
                        logger.debug(
                            f"[BALANCE-SYNC] Account {acct_id_str} not found on MT5 server."
                        )

                except Exception as ex:
                    logger.warning(f"[BALANCE-SYNC] Failed updating account {acct_id_str}: {ex}")

        logger.info(
            f"[BALANCE-SYNC] Processed {len(rows)} account(s), updated {updated_count} successfully."
        )
        return updated_count

    except Exception as e:
        logger.warning(f"[BALANCE-SYNC] Error in update_account_balances_in_db: {e}")
        return 0


# ─── Background thread ────────────────────────────────────────────────────────


def continuous_balance_updater(interval_seconds: float = 5.0):
    """
    Background daemon thread — runs the sync loop indefinitely.

    Connection lifecycle:
    1. Acquire the shared ManagerAPI once via get_shared_manager().
    2. Also acquire the MT5 API lock reference once via get_mt5_api_lock().
    3. Reuse both for every sync cycle — no new connections are opened.
    4. If the manager is None or becomes unhealthy, set manager=None and wait.
       The next iteration re-fetches from the singleton (which may have
       reconnected) without creating a new connection itself.
    """
    from adminPanel.mt5.services import get_shared_manager, get_mt5_api_lock
    from tortoise import Tortoise

    logger.info(f"[BALANCE-SYNC] Thread started. Sync interval: {interval_seconds}s.")
    mt5_lock = get_mt5_api_lock()  # single stable reference to the module RLock
    manager = None
    db_error_count = 0

    while True:
        # ── Step 0: ensure database readiness ─────────────────────────
        if not getattr(Tortoise, "_inited", False):
            logger.info("[BALANCE-SYNC] Waiting for Django database readiness...")
            try:
                from backendPanel.database import ensure_db_initialized
                from adminPanel.mt5.services import run_async

                run_async(ensure_db_initialized())
            except Exception as db_err:
                logger.warning(
                    f"[BALANCE-SYNC] Database not ready yet ({db_err}). Retrying in 5s..."
                )
                sleep(5.0)
                continue

        # ── Step 1: ensure we have a manager reference ────────────────
        if manager is None:
            logger.info("[BALANCE-SYNC] Starting MT5 manager initialization...")
            manager = get_shared_manager()
            if manager is None:
                logger.warning("[BALANCE-SYNC] MT5 Manager connection not ready. Waiting 10s...")
                sleep(_MANAGER_WAIT_INTERVAL)
                continue
            else:
                logger.info("[BALANCE-SYNC] Manager acquired successfully.")

        # ── Step 2: health-check the live connection ──────────────────
        if not _is_manager_alive(manager, mt5_lock):
            logger.warning(
                "[BALANCE-SYNC] Shared MT5 manager health check failed. Waiting for reconnect..."
            )
            manager = None
            sleep(_MANAGER_WAIT_INTERVAL)
            continue

        # ── Step 3: sync balances into PostgreSQL ─────────────────────
        try:
            updated_count = update_account_balances_in_db(manager, mt5_lock)
            db_error_count = 0
            logger.debug(f"[BALANCE-SYNC] Sync cycle complete. Updated {updated_count} account(s).")
        except Exception as e:
            db_error_count += 1
            logger.error(f"[BALANCE-SYNC] Sync error ({db_error_count}/{_MAX_DB_ERRORS}): {e}")
            if db_error_count >= _MAX_DB_ERRORS:
                logger.warning("[BALANCE-SYNC] Too many consecutive errors. Cooling down for 30s.")
                sleep(30)
                db_error_count = 0

        sleep(interval_seconds)


def start_balance_sync_thread(interval_seconds: float = 5.0):
    """Start the balance updater daemon thread — idempotent, safe to call multiple times."""
    global _balance_thread_started
    with _balance_thread_lock:
        if not _balance_thread_started:
            _balance_thread_started = True
            logger.info("[BALANCE-SYNC] Starting MT5 continuous balance sync background thread.")

            worker_context = copy_context()

            def _run_worker():
                worker_context.run(continuous_balance_updater, interval_seconds=interval_seconds)

            t = threading.Thread(
                target=_run_worker,
                daemon=True,
                name="mt5-balance-sync",
            )
            t.start()


# ─── Admin API endpoint ───────────────────────────────────────────────────────


@csrf_exempt
def sync_trading_balances_api(request):
    """
    POST/GET /api/admin/accounts/sync-balances

    Trigger an on-demand MT5 balance sync.  Uses the shared manager singleton
    — does NOT open a new MT5 connection.  Returns 503 if MT5 is not ready.
    """
    if request.method not in ["GET", "POST"]:
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        from adminPanel.mt5.services import get_shared_manager, get_mt5_api_lock

        account_id = request.GET.get("account_id") or request.POST.get("account_id")
        manager = get_shared_manager()

        if not manager:
            return JsonResponse(
                {
                    "success": False,
                    "message": "MT5 Manager is not connected yet.",
                    "synced_count": 0,
                },
                status=503,
            )

        mt5_lock = get_mt5_api_lock()
        synced_count = update_account_balances_in_db(
            manager, mt5_lock, target_account_id=account_id
        )

        return JsonResponse(
            {
                "success": True,
                "message": f"Successfully synchronized balances for {synced_count} account(s).",
                "synced_count": synced_count,
            }
        )
    except Exception as e:
        logger.error(f"[ADMIN] Error in sync_trading_balances_api: {e}")
        return JsonResponse(
            {
                "success": False,
                "message": str(e),
                "synced_count": 0,
            },
            status=500,
        )
