"""MetaTrader 5 Master/Follower Multi-Account Manager (MAM) Engine Entrypoint.

Refactored Architecture:
- Partitioned Follower Actors: Followers execute independently on dedicated queues.
- Guaranteed Ordering: FIFO command execution per follower (OPEN -> MODIFY -> CLOSE).
- Zero-DB-Latency Hot Path: Thread-safe in-memory caching for configuration & mapping.
- Multi-Layer Idempotency: Deduplication via in-memory atomic sets + DB UPSERTs.
- Stateful Differential Reconciliation: Safe recovery without blind duplicate copies.
"""

import atexit
import io
import logging
import os
import shutil
import sys
import tempfile
import threading
from datetime import datetime
from time import sleep, time
from typing import Any, Dict, List, Optional, Set

import django
from django.db import close_old_connections, connection
from dotenv import load_dotenv

# Fix Windows console encoding for Unicode characters
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(
        sys.stdout.buffer, encoding="utf-8", errors="replace", write_through=True
    )
    sys.stderr = io.TextIOWrapper(
        sys.stderr.buffer, encoding="utf-8", errors="replace", write_through=True
    )

load_dotenv()

# Setup process locking
LOCK_FILE = os.path.join(tempfile.gettempdir(), "mam_instance.lock")
_lock_file_handle = None


def acquire_process_lock() -> bool:
    """Acquire a file-based lock to ensure only one MAM instance runs."""
    global _lock_file_handle
    try:
        if os.path.exists(LOCK_FILE):
            try:
                with open(LOCK_FILE, "r") as f:
                    old_pid = int(f.read().strip())
                if old_pid == os.getpid():
                    return True
                if sys.platform == "win32":
                    import subprocess

                    result = subprocess.run(
                        ["tasklist", "/PID", str(old_pid)], capture_output=True, text=True
                    )
                    if str(old_pid) not in result.stdout:
                        os.remove(LOCK_FILE)
                    else:
                        return False
            except Exception:
                try:
                    os.remove(LOCK_FILE)
                except Exception:
                    pass

        _lock_file_handle = open(LOCK_FILE, "w")
        _lock_file_handle.write(str(os.getpid()))
        _lock_file_handle.flush()
        return True
    except (IOError, OSError):
        if _lock_file_handle:
            _lock_file_handle.close()
            _lock_file_handle = None
        return False


def release_process_lock():
    """Release process file lock."""
    global _lock_file_handle
    if _lock_file_handle:
        try:
            _lock_file_handle.close()
            os.remove(LOCK_FILE)
        except Exception:
            pass
        _lock_file_handle = None


atexit.register(release_process_lock)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Legacy global executor alias kept for backward-compatibility
from concurrent.futures import ThreadPoolExecutor

COPY_EXECUTOR = ThreadPoolExecutor(max_workers=128)

# Environment variables
AGENT_CODE_PREFIX = os.getenv("AGENT_CODE_PREFIX", "426")
STALE_THRESHOLD = float(os.getenv("STALE_THRESHOLD", "2.0"))
RESYNC_COOLDOWN = float(os.getenv("RESYNC_COOLDOWN", "15.0"))

# Global engine instance
_global_engine: Optional[Any] = None


def get_engine_health_status() -> dict:
    """Return live health status metrics of the MAM Copy Trading Engine and web server."""
    global _global_engine
    engine_active = bool(_global_engine and getattr(_global_engine, "_active", False))

    if engine_active:
        last_ts = getattr(_global_engine, "_last_activity_ts", time())
        idle_seconds = round(time() - last_ts, 1)
        dedupe_keys = len(getattr(_global_engine.idempotency, "_recent_copies", {}))
        return {
            "web_status": "Operational",
            "mt5_bridge_status": "Connected",
            "is_active": True,
            "engine_active": True,
            "idle_seconds": idle_seconds,
            "engine_mode": "Zero-Queue Parallel",
            "dedupe_cache_keys": dedupe_keys,
            "persistence_workers": 4,
        }
    return {
        "web_status": "Operational",
        "mt5_bridge_status": "Standby",
        "is_active": True,
        "engine_active": False,
        "idle_seconds": 0.0,
        "engine_mode": "Queue-Free Parallel",
        "dedupe_cache_keys": 0,
        "persistence_workers": 0,
    }


class ManagerEventRouter:
    """Routes master manager events concurrently into the MAMCopyEngine partitioning layer."""

    @staticmethod
    def route_position_copy(order_sink_inst, order_obj, force_flag=False):
        if _global_engine:
            _global_engine.route_master_position_open(order_obj)
        else:
            COPY_EXECUTOR.submit(order_sink_inst.copy_position_to_followers, order_obj, force_flag)

    @staticmethod
    def route_order_copy(order_sink_inst, order_obj, force_flag=False):
        if _global_engine:
            _global_engine.route_master_order_pending(order_obj)
        else:
            COPY_EXECUTOR.submit(order_sink_inst.copy_order_to_followers, order_obj, force_flag)

    @staticmethod
    def route_position_close(position_sink_inst, pos_obj):
        if _global_engine:
            _global_engine.route_master_position_close(pos_obj)
        else:
            COPY_EXECUTOR.submit(position_sink_inst.execute_manager_position_close, pos_obj)


# Legacy database helpers kept for backward compatibility
class ServerSetting:

    @staticmethod
    def get_latest_setting():
        try:
            close_old_connections()
            with connection.cursor() as cursor:
                cursor.execute(
                    'SELECT server_ip, real_account_login, real_account_password FROM "mt5_serversetting" WHERE server_type = true ORDER BY created_at DESC LIMIT 1'
                )
                row = cursor.fetchone()
                if row:
                    return {
                        "ip": row[0],
                        "login": row[1],
                        "password": row[2],
                    }
        except Exception as e:
            logger.error(f"[DB] Error fetching ServerSetting: {e}")
        return None


def run_mam_script():
    """Main application loop running the partitioned MAM copy engine."""
    global _global_engine

    if not acquire_process_lock():
        print("❌ Another MAM instance is already running!")
        print("   Only one MAM copy trading engine can run at a time.")
        print("   If you're sure no other instance is running, delete the lock file:")
        print(f"   {LOCK_FILE}")
        return

    print("✅ MAM process lock acquired successfully")

    # Setup Django environment if not already loaded
    if not django.apps.apps.ready:
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backendPanel.settings")
        django.setup()

    try:
        close_old_connections()
    except Exception:
        pass

    while True:
        setting = ServerSetting.get_latest_setting()
        if not setting:
            logger.warning("[MAM] No valid MT5 ServerSetting found in database. Retrying in 10s...")
            sleep(10)
            continue

        ip_address = setting["ip"]
        login = setting["login"]
        password = setting["password"]

        if not ip_address or not login or not password:
            logger.warning("[MAM] Missing IP/login/password in ServerSetting. Retrying in 10s...")
            sleep(10)
            continue

        print(f"Connecting to IP: {ip_address}, Login: {login}")
        import MT5Manager
        from MT5Manager import ManagerAPI

        unique_id = str(os.getpid())
        base_dir = os.path.join(os.getcwd(), "mt5_prop_instances")
        os.makedirs(base_dir, exist_ok=True)
        instance_dir = os.path.join(base_dir, unique_id)
        os.makedirs(instance_dir, exist_ok=True)

        module_path = os.path.dirname(MT5Manager.__file__)
        MT5Manager.InitializeManagerAPIPath(module_path=module_path, work_path=instance_dir)

        try:
            manager = ManagerAPI()
        except Exception as e:
            logger.error(f"Failed to instantiate ManagerAPI: {e}. Retrying in 10s...")
            sleep(10)
            continue

        try:
            if not manager.Connect(
                ip_address,
                int(login),
                password,
                MT5Manager.ManagerAPI.EnPumpModes.PUMP_MODE_FULL,
                timeout=120000,
            ):
                logger.error("[MAM] Connection failed to MT5 Manager API. Retrying in 10s...")
                sleep(10)
                continue
            logger.info("✅ Connected successfully to MT5 Manager Server")
        except Exception as e:
            logger.error(f"[MAM] Connection error: {e}. Retrying in 10s...")
            sleep(10)
            continue

        # Import and launch modern partitioned engine
        from backendPanel.mam_engine import MAMCopyEngine

        _global_engine = MAMCopyEngine(manager)
        _global_engine.start()

        # MT5 Event Sinks
        class DealSink:

            def OnDealAdd(self, deal):
                if _global_engine:
                    _global_engine._last_activity_ts = time()

        class DealerSink:

            def OnDealerResult(self, result):
                if _global_engine and _global_engine.dealer_sink:
                    _global_engine.dealer_sink.OnDealerResult(result)

            def OnDealerAnswer(self, answer):
                pass

        class OrderSink:

            def OnOrderUpdate(self, order):
                if _global_engine:
                    # Filter market orders (copied via OnOrderDelete -> position open)
                    if getattr(order, "Type", 0) >= 2 and order.State == 1:
                        _global_engine.route_master_order_pending(order)

            def OnOrderDelete(self, order):
                if _global_engine:
                    if order.State == 4 and order.ActivationMode == 0:
                        _global_engine.route_master_position_open(order)
                    elif order.State in {1, 2}:
                        _global_engine.route_master_order_delete(order)

            def copy_position_to_followers(self, order, force=False):
                if _global_engine:
                    _global_engine.route_master_position_open(order)

            def copy_order_to_followers(self, order, force=False):
                if _global_engine:
                    _global_engine.route_master_order_pending(order)

            def get_followers(self, loginID):
                if _global_engine:
                    return _global_engine.cache.get_followers(manager, loginID)
                return []

        class PositionSink:

            def OnPositionUpdate(self, position):
                if _global_engine:
                    _global_engine.route_master_position_modify(position)

            def OnPositionDelete(self, position):
                if _global_engine:
                    _global_engine.route_master_position_close(position)

            def execute_manager_position_close(self, position):
                if _global_engine:
                    _global_engine.route_master_position_close(position)

            def get_followers(self, loginID):
                if _global_engine:
                    return _global_engine.cache.get_followers(manager, loginID)
                return []

        dealer_sink = DealerSink()
        order_sink = OrderSink()
        position_sink = PositionSink()
        deal_sink = DealSink()

        try:
            if not manager.OrderSubscribe(order_sink):
                logger.error(f"Failed to subscribe to orders: {MT5Manager.LastError()}")
                break
            if not manager.PositionSubscribe(position_sink):
                logger.error(f"Failed to subscribe to positions: {MT5Manager.LastError()}")
                break
            if not manager.DealSubscribe(deal_sink):
                logger.error(f"Failed to subscribe to deals: {MT5Manager.LastError()}")
                break

            logger.info("🚀 Subscribed to MT5 Manager Order, Position, and Deal events successfully.")

            # Background reconciler watcher thread
            def reconciler_loop():
                while _global_engine and _global_engine._active:
                    try:
                        now = time()
                        idle_age = now - _global_engine._last_activity_ts
                        if idle_age > STALE_THRESHOLD:
                            _global_engine.reconciler.run_differential_resync(
                                cooldown_seconds=RESYNC_COOLDOWN
                            )
                        sleep(1.0)
                    except Exception as ex:
                        logger.error(f"[RECONCILER_LOOP] Exception: {ex}")
                        sleep(2.0)

            reconciler_thread = threading.Thread(
                target=reconciler_loop, name="MAM_Reconciler_Watcher", daemon=True
            )
            reconciler_thread.start()

            # Main heartbeat monitoring loop
            while True:
                sleep(0.5)

        except Exception as e:
            logger.error(f"[MAM] Engine execution loop error: {e}")
            if _global_engine:
                _global_engine.stop()
            sleep(5)
            continue


if __name__ == "__main__":
    try:
        run_mam_script()
    finally:
        release_process_lock()
        print("🔓 MAM process lock released")
