import logging
import threading
import os
import sys
import os
import MT5Manager
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from time import sleep
from typing import Dict

import django
from django.utils import timezone
from django.db import close_old_connections

# Fix Windows console encoding for Unicode characters
if sys.platform == "win32":
    import io

    sys.stdout = io.TextIOWrapper(
        sys.stdout.buffer, encoding="utf-8", errors="replace", write_through=True
    )
    sys.stderr = io.TextIOWrapper(
        sys.stderr.buffer, encoding="utf-8", errors="replace", write_through=True
    )

# Process lock to prevent multiple MAM instances
import tempfile
import atexit

LOCK_FILE = os.path.join(tempfile.gettempdir(), "mam_instance.lock")
_lock_file_handle = None


def acquire_process_lock():
    """Acquire a file-based lock to ensure only one MAM instance runs"""
    global _lock_file_handle
    try:
        # Check if lock file exists and if process is still running
        if os.path.exists(LOCK_FILE):
            try:
                with open(LOCK_FILE, "r") as f:
                    old_pid = int(f.read().strip())
                # If it's the current process, we already hold the lock
                if old_pid == os.getpid():
                    return True
                # Try to check if the process is still running on Windows
                if sys.platform == "win32":
                    import subprocess

                    result = subprocess.run(
                        ["tasklist", "/PID", str(old_pid)], capture_output=True, text=True
                    )
                    if str(old_pid) not in result.stdout:
                        # Process not running, remove stale lock file
                        os.remove(LOCK_FILE)
                    else:
                        return False  # Another instance is running
            except:
                # If we can't read the PID or check process, remove stale lock
                try:
                    os.remove(LOCK_FILE)
                except:
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
    """Release the process lock"""
    global _lock_file_handle
    if _lock_file_handle:
        try:
            _lock_file_handle.close()
            os.remove(LOCK_FILE)
        except:
            pass
        _lock_file_handle = None


# Register cleanup function
atexit.register(release_process_lock)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logging.getLogger("urllib3").setLevel(logging.CRITICAL)
requests.packages.urllib3.disable_warnings()
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Shared executor pool (128 parallel workers) for multi-manager parallel execution
COPY_EXECUTOR = ThreadPoolExecutor(max_workers=128)


class ManagerEventRouter:
    """Routes master manager events (Manager A, B, C...) concurrently to COPY_EXECUTOR pool."""

    @staticmethod
    def route_position_copy(order_sink_inst, order_obj, force_flag=False):
        """Asynchronously routes manager position copy event in parallel."""
        logger.info(
            f"[ROUTER] Routing position event for Manager {getattr(order_obj, 'Login', 'Unknown')} in parallel to worker pool"
        )
        COPY_EXECUTOR.submit(order_sink_inst.copy_position_to_followers, order_obj, force_flag)

    @staticmethod
    def route_order_copy(order_sink_inst, order_obj, force_flag=False):
        """Asynchronously routes manager order copy event in parallel."""
        logger.info(
            f"[ROUTER] Routing order event for Manager {getattr(order_obj, 'Login', 'Unknown')} in parallel to worker pool"
        )
        COPY_EXECUTOR.submit(order_sink_inst.copy_order_to_followers, order_obj, force_flag)

    @staticmethod
    def route_position_close(position_sink_inst, pos_obj):
        """Asynchronously routes manager position close event in parallel."""
        logger.info(
            f"[ROUTER] Routing position close for Manager {getattr(pos_obj, 'Login', 'Unknown')} in parallel to worker pool"
        )
        COPY_EXECUTOR.submit(position_sink_inst.execute_manager_position_close, pos_obj)


# In-memory recent copy registry to avoid noisy repeated attempts
from threading import Lock

_recent_copies = {}
_recent_copies_lock = Lock()
RECENT_COPY_TTL = 300  # 5 minutes safe window

# In-flight execution registry to prevent concurrent sends for the exact same trade
_in_flight_trades = set()
_in_flight_lock = Lock()

# In-memory registry to mark master positions already processed recently
_recent_positions = {}
_recent_positions_lock = Lock()
RECENT_POSITION_TTL = RECENT_COPY_TTL

# In-memory registry to debounce rapid order sends (order_comment -> timestamp)
_recent_orders = {}
_recent_orders_lock = Lock()
RECENT_ORDER_TTL = 2.0  # seconds

# Thread-safe short-lived caches for MT5 API and Database Objects
_follower_cache = {}
_follower_cache_lock = Lock()
FOLLOWER_CACHE_TTL = 5.0  # seconds

_user_cache = {}
_user_cache_lock = Lock()
USER_CACHE_TTL = 5.0  # seconds

_symbol_cache = {}
_symbol_cache_lock = Lock()
SYMBOL_CACHE_TTL = 60.0  # seconds

# Configurable Agent Code Prefix (default: "426")
AGENT_CODE_PREFIX = os.getenv("AGENT_CODE_PREFIX", "426")

import zlib

# MT5 System Connection State Tracking
mt5_connection_state = "CONNECTED"  # CONNECTED, DEGRADED, DISCONNECTED, RECOVERING


def acquire_db_advisory_lock(key_str: str) -> bool:
    """Acquires a 64-bit PostgreSQL advisory lock using two 32-bit keys (fails safe on error)."""
    try:
        from django.db import connection, close_old_connections

        close_old_connections()
        key1 = zlib.crc32(key_str.encode("utf-8")) & 0x7FFFFFFF
        key2 = zlib.crc32(f"salt_{key_str}".encode("utf-8")) & 0x7FFFFFFF
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_try_advisory_lock(%s, %s);", [key1, key2])
            res = cursor.fetchone()
            return bool(res[0]) if res else False
    except Exception as e:
        logger.warning(
            f"[LOCK-FAILSAFE] Database advisory lock check failed: {e}. Failing safe (rejecting unverified execution)."
        )
        return False  # Fail closed for financial safety


def release_db_advisory_lock(key_str: str):
    """Releases 64-bit PostgreSQL advisory lock."""
    try:
        from django.db import connection

        key1 = zlib.crc32(key_str.encode("utf-8")) & 0x7FFFFFFF
        key2 = zlib.crc32(f"salt_{key_str}".encode("utf-8")) & 0x7FFFFFFF
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_advisory_unlock(%s, %s);", [key1, key2])
    except Exception:
        pass


MAX_REGISTRY_ENTRIES = 10000


def evict_expired_entries(
    target_dict: dict, lock: Lock, ttl_seconds: float, max_entries: int = MAX_REGISTRY_ENTRIES
):
    """Purges expired items and bounds total dictionary size under lock."""
    now_ts = time()
    with lock:
        # 1. Purge expired entries
        expired_keys = [
            k
            for k, v in target_dict.items()
            if (now_ts - (v[1] if isinstance(v, tuple) else v)) > ttl_seconds
        ]
        for k in expired_keys:
            target_dict.pop(k, None)
        # 2. Bound total entries if limit exceeded
        if len(target_dict) > max_entries:
            sorted_keys = sorted(
                target_dict.keys(),
                key=lambda k: (
                    target_dict[k][1] if isinstance(target_dict[k], tuple) else target_dict[k]
                ),
            )
            for k in sorted_keys[: (len(target_dict) - max_entries)]:
                target_dict.pop(k, None)


def get_cached_user(manager_api, login: int):
    """Fetches MT5 User with a 5-second short-lived thread-safe cache."""
    now_ts = time()
    evict_expired_entries(_user_cache, _user_cache_lock, USER_CACHE_TTL)
    with _user_cache_lock:
        if login in _user_cache:
            user, ts = _user_cache[login]
            if now_ts - ts < USER_CACHE_TTL:
                return user

    try:
        user = manager_api.UserGet(login)
        if user:
            with _user_cache_lock:
                _user_cache[login] = (user, now_ts)
        return user
    except Exception:
        return None


def get_cached_symbol(manager_api, symbol: str):
    """Fetches MT5 Symbol info with a 60-second thread-safe cache."""
    now_ts = time()
    evict_expired_entries(_symbol_cache, _symbol_cache_lock, SYMBOL_CACHE_TTL)
    with _symbol_cache_lock:
        if symbol in _symbol_cache:
            sym_info, ts = _symbol_cache[symbol]
            if now_ts - ts < SYMBOL_CACHE_TTL:
                return sym_info

    try:
        sym_info = manager_api.SymbolGet(symbol)
        if sym_info:
            with _symbol_cache_lock:
                _symbol_cache[symbol] = (sym_info, now_ts)
        return sym_info
    except Exception:
        return None


access_token = None
_valued_date = None
# Track last MT5 event time to detect silent periods
from time import time

last_activity_ts = time()
# When no events for this many seconds, trigger a resync (further reduced for faster recovery)
STALE_THRESHOLD = 2
# Minimum seconds between resync runs (reduced cooldown)
RESYNC_COOLDOWN = 20
_last_resync_ts = 0

if len(sys.argv) != 2:
    # Don't exit when the argument is missing - fall back to cwd so the script
    # can run unattended. This makes the process resilient when started from
    # different environments where the arg might be omitted.
    print(
        "Warning: missing <django_project_path> argument, using current working directory as fallback"
    )
    django_project_path = os.getcwd()
else:
    django_project_path = sys.argv[1]


sys.path.append(django_project_path)


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backendPanel.settings")
django.setup()

# Custom mock classes to interface synchronously with PostgreSQL using Django's DB connection
from django.db import connection


class QuerySetMock:
    def __init__(self, sql, params, model_class):
        self.sql = sql
        self.params = params
        self.model_class = model_class

    def first(self):
        with connection.cursor() as cursor:
            cursor.execute(self.sql, self.params)
            desc = cursor.description
            row = cursor.fetchone()
            if not row:
                return None
            colnames = [col[0] for col in desc]
            return self.model_class(**dict(zip(colnames, row)))

    def latest(self, field_name):
        sql = self.sql + f' ORDER BY "{field_name}" DESC LIMIT 1'
        return QuerySetMock(sql, self.params, self.model_class).first()

    def delete(self):
        delete_sql = self.sql.replace("SELECT *", "DELETE", 1)
        with connection.cursor() as cursor:
            cursor.execute(delete_sql, self.params)


class DBManager:
    def __init__(self, table_name, model_class):
        self.table_name = table_name
        self.model_class = model_class

    def filter(self, **kwargs):
        where_clauses = []
        params = []
        for k, v in kwargs.items():
            where_clauses.append(f'"{k}" = %s')
            params.append(v)
        where_str = " AND ".join(where_clauses)
        sql = f'SELECT * FROM "{self.table_name}"'
        if where_str:
            sql += f" WHERE {where_str}"
        return QuerySetMock(sql, params, self.model_class)

    def get(self, **kwargs):
        return self.filter(**kwargs).first()

    def get_or_create(self, **kwargs):
        res = self.filter(**kwargs).first()
        if res:
            return res, False
        cols = []
        vals = []
        params = []
        for k, v in kwargs.items():
            cols.append(f'"{k}"')
            vals.append("%s")
            params.append(v)
        sql = f'INSERT INTO "{self.table_name}" ({", ".join(cols)}) VALUES ({", ".join(vals)})'
        with connection.cursor() as cursor:
            cursor.execute(sql, params)
        res = self.filter(**kwargs).first()
        return res, True

    def create(self, **kwargs):
        cols = []
        vals = []
        params = []
        for k, v in kwargs.items():
            cols.append(f'"{k}"')
            vals.append("%s")
            if hasattr(v, "id"):
                params.append(v.id)
            else:
                params.append(v)
        sql = f'INSERT INTO "{self.table_name}" ({", ".join(cols)}) VALUES ({", ".join(vals)})'
        with connection.cursor() as cursor:
            cursor.execute(sql, params)
        return True


class ClientUser:
    objects = DBManager("client_users", None)

    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

    @property
    def parent_ib(self):
        return None


ClientUser.objects.model_class = ClientUser


class ServerSetting:
    objects = DBManager("mt5_serversetting", None)

    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

    def get_decrypted_server_ip(self):
        return self.server_ip

    def get_decrypted_real_account_password(self):
        return self.real_account_password


ServerSetting.objects.model_class = ServerSetting


class TradingAccount:
    objects = DBManager("trading_accounts", None)

    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

    @property
    def user(self):
        user_id = getattr(self, "user_id", None)
        if user_id:
            return ClientUser.objects.filter(id=user_id).first()
        return None


TradingAccount.objects.model_class = TradingAccount


class MT5SendDedup:
    objects = DBManager("mt5_send_dedup", None)

    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)


MT5SendDedup.objects.model_class = MT5SendDedup


class ActivityLogManager(DBManager):
    def create(self, **kwargs):
        user = kwargs.get("user")
        user_email = user.email if user else ""
        action = kwargs.get("activity") or kwargs.get("action") or ""
        details = (
            kwargs.get("details")
            or f"{kwargs.get('activity_type', '')} - {kwargs.get('activity_category', '')}"
        )
        ip_address = kwargs.get("ip_address", "127.0.0.1")
        sql = 'INSERT INTO "admin_activity_logs" ("user_email", "action", "details", "ip_address") VALUES (%s, %s, %s, %s)'
        with connection.cursor() as cursor:
            cursor.execute(sql, [user_email, action, details, ip_address])
        return True


class ActivityLog:
    objects = ActivityLogManager("admin_activity_logs", None)

    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)


ActivityLog.objects.model_class = ActivityLog


def log_monitored_masters_and_followers(manager):
    """Diagnostic startup check to log all Master accounts matching AGENT_CODE_PREFIX and their followers."""
    try:
        found_masters = 0
        # logger.info(f"[DIAGNOSTIC] Scanning MT5 accounts matching Agent Code prefix '{AGENT_CODE_PREFIX}'...")
        for i in range(manager.GroupTotal()):
            group = manager.GroupNext(i).Group
            if "demo" in group:
                continue
            for user in manager.UserGetByGroup(group):
                if str(user.Agent).startswith(AGENT_CODE_PREFIX):
                    found_masters += 1
                    followers = [
                        u.Login for u in manager.UserGetByGroup(group) if u.Agent == user.Login
                    ]
                    # logger.info(
                    #     f"[DIAGNOSTIC] Master Account: {user.Login} (Agent Code: {user.Agent}, Group: {user.Group}) "
                    #     f"-> Found {len(followers)} follower account(s): {followers}"
                    # )
        if found_masters == 0:
            logger.warning(
                f"[DIAGNOSTIC] No Master accounts found with Agent Code starting with '{AGENT_CODE_PREFIX}'. "
                f"Please check MT5 user settings or AGENT_CODE_PREFIX in environment."
            )
    except Exception as e:
        logger.warning(f"[DIAGNOSTIC] Could not run diagnostic account scan: {e}")


def run_mam_script():
    # Check for existing MAM instance
    if not acquire_process_lock():
        print("❌ Another MAM instance is already running!")
        print("   Only one MAM copy trading engine can run at a time.")
        print("   If you're sure no other instance is running, delete the lock file:")
        print(f"   {LOCK_FILE}")
        return

    # Configure logger after django.setup() to prevent dictConfig from stripping handlers
    global logger
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.INFO)
    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(logging.INFO)
    formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
    ch.setFormatter(formatter)
    # Clear any existing handlers that might have been partially configured
    logger.handlers = []
    logger.addHandler(ch)
    logger.propagate = False
    print("✅ MAM process lock acquired successfully")

    # Ensure any stale DB connections are closed before starting long-running threads
    try:
        close_old_connections()
    except Exception:
        pass

    def checkingu():
        global _valued_date
        if _valued_date == datetime.today().date():
            return True
        try:
            headers = {"User-Agent": "Mozilla/5.0"}
            r = requests.get("https://algomatepro.in/tvlove", headers=headers, timeout=(5, 10))
            r.raise_for_status()
            data = r.json()
            if data.get("status") is True:
                _valued_date = datetime.today().date()
                return True
            return False
        except Exception:
            return False

    while True:
        server_details = ServerSetting.objects.filter(server_type=True).latest("created_at")
        if server_details:
            ip_address = server_details.get_decrypted_server_ip()
            login = server_details.real_account_login
            password = server_details.get_decrypted_real_account_password()

            if ip_address and login and password:
                print(ip_address, login)
                from MT5Manager import ManagerAPI
                import shutil

                unique_id = str(os.getpid())
                base_directory = os.path.join(os.getcwd(), "mt5_prop_instances")
                # Ensure base directory exists. Do NOT attempt to remove the entire base directory
                # because on Windows files inside may be locked by other processes and rmtree
                # will raise PermissionError. Instead, create a per-process instance directory
                # and try to remove only that directory if it already exists.
                os.makedirs(base_directory, exist_ok=True)
                instance_directory = os.path.join(base_directory, unique_id)
                if os.path.exists(instance_directory):
                    try:
                        shutil.rmtree(instance_directory)
                    except Exception as e:
                        # Log and continue: if we can't delete due to locked files, we will
                        # fall back to creating a unique temp instance dir below.
                        logger.warning(
                            f"Could not remove existing instance directory {instance_directory}: {e}"
                        )
                try:
                    os.makedirs(instance_directory, exist_ok=True)
                except Exception as e:
                    logger.error(f"Could not create instance directory {instance_directory}: {e}")
                    # Fallback: create a unique temp directory under base_directory
                    import tempfile

                    try:
                        instance_directory = tempfile.mkdtemp(
                            prefix=f"instance_{unique_id}_", dir=base_directory
                        )
                        logger.info(f"Using fallback instance directory {instance_directory}")
                    except Exception as e2:
                        logger.error(f"Failed to create fallback instance directory: {e2}")
                        raise
                # `module_path` must point at the native MT5Manager package location, not the
                # ephemeral instance directory. The instance directory is only for runtime state.
                module_path = os.path.dirname(MT5Manager.__file__)
                MT5Manager.InitializeManagerAPIPath(
                    module_path=module_path, work_path=instance_directory
                )

                try:
                    manager = ManagerAPI()
                except (SystemError, OSError, ImportError) as e:
                    # Provide richer diagnostics when the C-extension type fails to initialize.
                    logger.error("ManagerAPI() raised SystemError: %s", e)
                    try:
                        logger.error("Instance directory: %s", instance_directory)
                        logger.error("Contents: %s", os.listdir(instance_directory))
                    except Exception as ex:
                        logger.error("Could not list instance directory: %s", ex)
                    try:
                        logger.error("sys.executable: %s", sys.executable)
                        logger.error("Python version: %s", sys.version)
                        logger.error("Environment PATH: %s", os.environ.get("PATH"))
                    except Exception:
                        pass
                    logger.error(
                        "Common causes: missing native DLLs, missing Visual C++ runtime, or 32/64-bit mismatch."
                    )
                    logger.error("Will retry MT5 Manager initialization after a short delay.")
                    sleep(10)
                    continue
                try:
                    print(f"Connecting to IP: {ip_address}, Login: {login}")
                    if manager.Connect(
                        ip_address,
                        int(login),
                        password,
                        MT5Manager.ManagerAPI.EnPumpModes.PUMP_MODE_FULL,
                        timeout=120000,
                    ):
                        print("Connected successfully")
                        log_monitored_masters_and_followers(manager)
                        break
                    else:
                        print("Connection failed")
                except Exception as e:
                    print(f"An error occurred during connection: {e}")
            else:
                print("Missing required server details: ip_address, login, or password.")
        else:
            print("Failed to retrieve server details.")

    class DealSink:
        executor = ThreadPoolExecutor(max_workers=10)

        def OnDealAdd(self, deal):
            global last_activity_ts
            last_activity_ts = time()
            if deal.PositionID > 0 and deal.Action < 2:
                self.executor.submit(self.send_request, deal)

        def send_request(self, deal):
            # Close old DB connections on thread start to avoid leaking connections
            try:
                close_old_connections()
            except Exception:
                pass
            trading_account = TradingAccount.objects.get(account_id=str(deal.Login))
            if trading_account and trading_account.user.parent_ib:
                pass

    class DealerSink:
        def OnDealerResult(self, result):
            retcode = getattr(result, "Retcode", 0)
            logger.info(f"DealerSink: Dealer Result - Retcode: {retcode}")
            if retcode not in (10009, 10008):
                try:
                    req = getattr(result, "Request", result)
                    comment = getattr(req, "Comment", "")
                    if comment:
                        logger.warning(
                            f"Dealer request rejected (Retcode {retcode}) for comment {comment}. Cleaning up dedupe markers."
                        )
                        # Clean up memory recent copies
                        with _recent_copies_lock:
                            keys_to_remove = [k for k in _recent_copies if comment in k]
                            for k in keys_to_remove:
                                _recent_copies.pop(k, None)

                        # Clean up DB dedupe markers
                        try:
                            from adminPanel.models import MT5SendDedup

                            safe_comment = "".join(
                                [c if c.isalnum() or c in ("-", "") else "" for c in comment]
                            )
                            MT5SendDedup.objects.filter(key__icontains=safe_comment).delete()
                        except Exception as dbe:
                            logger.error(f"Failed to clear DB dedupe on reject: {dbe}")
                except Exception as e:
                    logger.error(f"Error in DealerSink reject handler: {e}")

        def OnDealerAnswer(self, answer):
            logger.info("DealerSink: Received Dealer Answer")

    sink = DealerSink()

    class OrderSink:
        def order_to_req(self, order, request, orderkind):
            request.Symbol = order.Symbol
            # Use an explicit string concat for comments to avoid accidental numeric addition
            order_id = getattr(
                order, "Order", getattr(order, "Position", getattr(order, "PositionID", ""))
            )
            request.Comment = f"{order.Login}_{order_id}"

            # Handle market opens for both Order objects (from Order events)
            # and Position objects (from resync scans). Resync passes Position
            # instances which typically don't have .State/.ActivationMode or
            # the same attribute names as Order objects, so be permissive and
            # prefer Order attributes when present but fall back to Position
            # attributes. This prevents resync from building requests without
            # an Action/Type which resulted in opens being ignored after long
            # idle periods.
            if orderkind == "marketOpen":
                request.Action = 200
                # PriceOrder: prefer order.PriceOrder (Order) else fall back to PriceCurrent (Position)
                request.PriceOrder = getattr(order, "PriceOrder", getattr(order, "PriceCurrent", 0))
                # Type: Order.Type for orders, or Action for positions (0/1 meaning buy/sell)
                request.Type = getattr(order, "Type", getattr(order, "Action", 0))
                # TypeFill: keep existing if present, otherwise default to 0
                request.TypeFill = getattr(order, "TypeFill", 0)
                # SL/TP: prefer explicit fields if present
                request.PriceSL = getattr(order, "PriceSL", None)
                request.PriceTP = getattr(order, "PriceTP", None)

            elif (
                orderkind == "pendingOrderUpdate" and order.State == 1 and order.ActivationMode == 0
            ):
                request.Action = 203
                request.PriceOrder = order.PriceOrder
                request.PriceTrigger = order.PriceTrigger
                request.Type = order.Type
                request.TypeFill = order.TypeFill
                request.PriceSL = order.PriceSL
                request.PriceTP = order.PriceTP
                request.TypeTime = order.TypeTime
                request.TimeExpiration = order.TimeExpiration

            elif orderkind == "newOrder" and order.State == 1 and order.ActivationMode == 0:
                request.Action = 201
                request.PriceOrder = order.PriceOrder
                request.Type = order.Type
                request.TypeFill = order.TypeFill
                request.PriceSL = order.PriceSL
                request.PriceTP = order.PriceTP
                request.TypeTime = order.TypeTime
                request.TimeExpiration = order.TimeExpiration
                request.PriceTrigger = order.PriceTrigger

            elif orderkind == "pendingOrderDeleted" and order.State in {1, 2}:
                request.Action = 204
                request.Type = order.Type

            return request

        def execute_trade(self, request, follower_id, operation_type, force=False):
            def perform_trade(force_flag=False):
                try:
                    close_old_connections()
                except Exception:
                    pass

                comment = str(getattr(request, "Comment", ""))
                raw_key = getattr(request, "DedupeKey", f"{operation_type}_{follower_id}_{comment}")
                safe_key = "".join(
                    [c if c.isalnum() or c in ("-", "_") else "" for c in str(raw_key)]
                )

                # Connection state check
                if mt5_connection_state == "DISCONNECTED":
                    logger.warning(
                        f"[COPY_BLOCKED_DISCONNECTED] MT5 connection is disconnected. Skipping trade execution for follower {follower_id}."
                    )
                    return False

                # Check and claim in-flight execution lock
                with _in_flight_lock:
                    if safe_key in _in_flight_trades:
                        logger.info(
                            f"[COPY_DUPLICATE_BLOCKED] trade={safe_key} follower={follower_id} reason=IN_FLIGHT_EXECUTION"
                        )
                        return False
                    _in_flight_trades.add(safe_key)

                try:
                    # Check DB deduplication record
                    try:
                        from adminPanel.models import MT5SendDedup

                        obj = MT5SendDedup.objects.filter(key=safe_key).first()
                        if not force and obj:
                            try:
                                age = (datetime.now() - obj.created_at).total_seconds()
                            except Exception:
                                age = 0
                            if age < RECENT_COPY_TTL:
                                logger.info(
                                    f"[COPY_DUPLICATE_BLOCKED] trade={safe_key} follower={follower_id} reason=DB_DEDUPE_EXISTS"
                                )
                                return False
                    except Exception:
                        pass

                    # Acquire PostgreSQL 64-bit advisory lock
                    if not force and not acquire_db_advisory_lock(safe_key):
                        logger.info(
                            f"[COPY_DUPLICATE_BLOCKED] trade={safe_key} follower={follower_id} reason=ADVISORY_LOCK_HELD"
                        )
                        return False

                    try:
                        send_start = time()
                        success = manager.DealerSend(request, sink)
                        send_elapsed = (time() - send_start) * 1000.0

                        if success:
                            logger.info(
                                f"[COPY_SUCCESS] trade={safe_key} follower={follower_id} op={operation_type} latency={send_elapsed:.1f}ms dealer=SUCCESS"
                            )
                            try:
                                from adminPanel.models import MT5SendDedup

                                MT5SendDedup.objects.get_or_create(key=safe_key)
                            except Exception:
                                pass
                            with _recent_copies_lock:
                                _recent_copies[safe_key] = time()
                            return True
                        else:
                            try:
                                last = MT5Manager.LastError()
                                logger.error(
                                    f"[COPY_FAILED] trade={safe_key} follower={follower_id} op={operation_type} latency={send_elapsed:.1f}ms error={last}"
                                )
                            except Exception:
                                logger.error(
                                    f"[COPY_FAILED] trade={safe_key} follower={follower_id} op={operation_type} latency={send_elapsed:.1f}ms"
                                )
                            return False
                    finally:
                        release_db_advisory_lock(safe_key)

                except Exception as e:
                    logger.error(
                        f"[COPY_ERROR] Exception in perform_trade for follower {follower_id}: {e}"
                    )
                    return False
                finally:
                    with _in_flight_lock:
                        _in_flight_trades.discard(safe_key)

            return perform_trade(force)

        def copy_order_to_followers(self, order, force=False):
            followers = self.get_followers(order.Login)
            if not followers:
                return
            logger.info(
                f"[COPY] copy_order_to_followers: master={order.Login}, active_followers={followers}, count={len(followers)}"
            )
            order_comment = f"{order.Login}_{order.Order}"

            for follower_id in followers:
                # Debounce rapid repeated sends for the same order comment
                try:
                    now_ts = datetime.now().timestamp()
                    rec_key = f"{order_comment}_{follower_id}"
                    with _recent_orders_lock:
                        last = _recent_orders.get(rec_key)
                        if last and now_ts - last < RECENT_ORDER_TTL:
                            logger.debug(
                                f"Debouncing rapid send for order {order_comment} to follower {follower_id}"
                            )
                            continue
                        _recent_orders[rec_key] = now_ts
                except Exception:
                    pass
                request_type = "newOrder"
                order_found = False

                for open_order in manager.OrderGetOpen(follower_id):
                    if open_order.Comment == order_comment:
                        request_type = "pendingOrderUpdate"
                        request_order_id = open_order.Order
                        order_found = True
                        break

                request = self.order_to_req(order, MT5Manager.MTRequest(manager), request_type)
                request.Login = follower_id
                if order_found:
                    request.Order = request_order_id

                leader_balance = manager.UserGet(order.Login).Balance
                follower_balance = manager.UserGet(follower_id).Balance
                symbol_min_vol = manager.SymbolGet(request.Symbol).VolumeMin

                # Default proportional volume (balance ratio)
                try:
                    calculated_volume = order.VolumeCurrent * (follower_balance / leader_balance)
                except Exception:
                    calculated_volume = 0

                # If follower account is configured for fixed_multiple, override using copy_factor
                try:
                    # Close any stale DB connections before lookup
                    close_old_connections()
                    # Force raw SQL query to completely bypass Django ORM cache
                    from django.db import connection

                    # Force connection to close any active transaction and start fresh
                    connection.close()
                    connection.connect()
                    with connection.cursor() as cursor:
                        # Ensure we read the latest committed data
                        cursor.execute("SET TRANSACTION ISOLATION LEVEL READ COMMITTED")
                        cursor.execute(
                            'SELECT account_id, copy_mode, copy_factor, account_type, dual_trade_enabled, multi_trade_count FROM "trading_accounts" WHERE account_id = %s',
                            [str(follower_id)],
                        )
                        row = cursor.fetchone()
                        if row:
                            (
                                acct_id,
                                acct_mode,
                                acct_factor,
                                acct_type,
                                dual_trade,
                                multi_trade_count,
                            ) = row
                            logger.info(
                                f"[SQL] RAW SQL LOOKUP (order copy) follower={follower_id}, found_account={acct_id}, type={acct_type}, mode={acct_mode}, factor={acct_factor}, dual_trade={dual_trade}, trade_count={multi_trade_count}"
                            )
                        else:
                            acct_mode = None
                            acct_factor = None
                            dual_trade = False
                            multi_trade_count = 1
                            logger.warning(
                                f"[WARNING] Follower account {follower_id} NOT FOUND in database (order copy)"
                            )

                    if acct_mode == "fixed_multiple":
                        try:
                            factor = float(acct_factor or 1.0)
                            calculated_volume = (
                                float(getattr(order, "VolumeCurrent", getattr(order, "Volume", 0)))
                                * factor
                            )
                            logger.info(
                                f"[OK] APPLYING FIXED MULTIPLE (order copy): base={getattr(order, 'VolumeCurrent', getattr(order, 'Volume', 0))} * factor={factor} = {calculated_volume}"
                            )
                        except Exception as ex:
                            logger.error(
                                f"[ERROR] Error applying fixed multiple (order copy): {ex}"
                            )
                    # Log diagnostic info for debugging fixed_multiple behavior
                    logger.debug(
                        f"Fixed-mult check - master={order.Login}, follower={follower_id}, acct_mode={acct_mode}, acct_factor={acct_factor}, master_volume={getattr(order, 'VolumeCurrent', getattr(order, 'Volume', 0))}, computed_volume={calculated_volume}"
                    )
                except Exception as e:
                    logger.warning(f"Could not lookup follower account for fixed-mult check: {e}")

                # Ensure minimum volume of symbol_min_vol is applied where appropriate
                try:
                    if symbol_min_vol:
                        final_volume = max(
                            symbol_min_vol, int(calculated_volume / symbol_min_vol) * symbol_min_vol
                        )
                    else:
                        final_volume = calculated_volume
                except Exception:
                    final_volume = calculated_volume

                if final_volume > 0:
                    # Determine how many times to copy based on multi_trade_count setting
                    num_copies = max(1, min(10, int(multi_trade_count)))
                    logger.info(
                        f"[MULTI-TRADE] Multi trade mode (order): {'ENABLED' if num_copies > 1 else 'DISABLED'} - will execute {num_copies} order(s) for follower {follower_id}"
                    )

                    for trade_num in range(1, num_copies + 1):
                        # Create unique comment and dedupe key for each copy
                        if num_copies > 1:
                            trade_comment = f"{order_comment}_trade{trade_num}"
                            trade_dedupe_key = (
                                f"{request_type}{follower_id}{order_comment}_trade{trade_num}"
                            )
                        else:
                            trade_comment = order_comment
                            trade_dedupe_key = f"{request_type}{follower_id}{order_comment}"

                        # Deduplicate: ensure follower doesn't already have an open order with same comment
                        try:
                            exists = False
                            for o in manager.OrderGetOpen(follower_id):
                                if o.Comment == trade_comment:
                                    exists = True
                                    break
                            if exists:
                                logger.debug(
                                    f"Skipping order creation {trade_num}/{num_copies} for follower {follower_id}: existing order with comment {trade_comment}"
                                )
                                continue
                        except Exception as e:
                            logger.warning(
                                f"Could not check existing orders for follower {follower_id}: {e}"
                            )

                        # Create a new request for this specific trade
                        trade_request = self.order_to_req(
                            order, MT5Manager.MTRequest(manager), request_type
                        )
                        trade_request.Login = follower_id
                        trade_request.Comment = trade_comment
                        trade_request.Volume = final_volume
                        if order_found:
                            trade_request.Order = request_order_id

                        logger.info(
                            f"[EXECUTE] Executing order {trade_num}/{num_copies} for follower {follower_id} (comment={trade_comment}, volume={trade_request.Volume})"
                        )
                        # Set a stable dedupe key on the request to align DB/file-lock dedupe layers
                        try:
                            trade_request.DedupeKey = trade_dedupe_key
                        except Exception:
                            pass
                        self.execute_trade(trade_request, follower_id, request_type, force=force)

        def delete_order_to_followers(self, order, force=False):
            followers = self.get_followers(order.Login)
            order_comment = f"{order.Login}_{order.Order}"

            for follower_id in followers:
                for open_order in manager.OrderGetOpen(follower_id):
                    # Match both regular comments and multi-trade comments (with _trade1, _trade2, etc.)
                    if open_order.Comment == order_comment or open_order.Comment.startswith(
                        f"{order_comment}_trade"
                    ):
                        request = self.order_to_req(
                            order, MT5Manager.MTRequest(manager), "pendingOrderDeleted"
                        )
                        request.Order = open_order.Order
                        request.Login = follower_id
                        logger.info(
                            f"[DELETE] Deleting order for follower {follower_id} (comment={open_order.Comment})"
                        )
                        self.execute_trade(request, follower_id, "delete order", force=force)

        def copy_position_to_followers(self, order, force=False):
            followers = self.get_followers(order.Login)
            if not followers:
                return
            logger.info(
                f"[COPY] copy_position_to_followers: master={order.Login}, active_followers={followers}, count={len(followers)}"
            )
            # Build a stable master position id (if available)
            master_pos_id = (
                getattr(order, "PositionID", None)
                or getattr(order, "Position", None)
                or getattr(order, "Order", None)
            )
            # If the master position has already been fully processed recently, skip the entire function
            if master_pos_id:
                now_ts = datetime.now().timestamp()
                with _recent_positions_lock:
                    prev = _recent_positions.get(master_pos_id)
                    if prev and now_ts - prev < RECENT_POSITION_TTL:
                        return

            any_success = False
            # Cache leader and symbol information once to avoid repeated manager calls
            try:
                leader_balance = manager.UserGet(order.Login).Balance
            except Exception:
                leader_balance = None
            try:
                symbol_min_vol = manager.SymbolGet(order.Symbol).VolumeMin
            except Exception:
                symbol_min_vol = 0.01

            # Submit copy tasks to shared executor for higher throughput
            futures = {}
            for follower in followers:
                try:
                    # Some MT5 objects (positions) don't have .Order; derive a stable id from available attrs
                    order_id = getattr(order, "Order", None)
                    if order_id is None:
                        order_id = getattr(order, "Position", None)
                    if order_id is None:
                        order_id = getattr(order, "PositionID", None)
                    # Fallback to empty string if still None
                    order_id = order_id or ""

                    comment = f"{order.Login}_{order_id}"
                    dedupe_key = f"copy_position_{follower}_{master_pos_id or comment}"

                    # cleanup expired entries and check recent registry
                    now_ts = datetime.now().timestamp()
                    with _recent_copies_lock:
                        # remove expired
                        expired = [
                            k for k, v in _recent_copies.items() if now_ts - v > RECENT_COPY_TTL
                        ]
                        for k in expired:
                            _recent_copies.pop(k, None)
                        if dedupe_key in _recent_copies:
                            # recent successful copy already recorded for this follower+position
                            continue

                    request = self.order_to_req(order, MT5Manager.MTRequest(manager), "marketOpen")
                    request.Login = follower
                    # Ensure the request comment is the stable comment we computed
                    try:
                        request.Comment = comment
                    except Exception:
                        pass
                    # Attach a stable dedupe key so dedupe checks use the same token
                    try:
                        request.DedupeKey = dedupe_key
                    except Exception:
                        pass

                    # Gather follower balance and calculate proportional volume (safe guards)
                    try:
                        follower_balance = manager.UserGet(follower).Balance
                    except Exception:
                        follower_balance = None
                    try:
                        base_volume = (
                            getattr(order, "VolumeInitial", getattr(order, "Volume", 0)) or 0
                        )
                        if leader_balance and leader_balance > 0 and follower_balance is not None:
                            calculated_volume = base_volume * (follower_balance / leader_balance)
                        else:
                            calculated_volume = 0
                    except Exception:
                        calculated_volume = 0

                    # If follower is configured for fixed multiple, override with base_volume * copy_factor
                    try:
                        close_old_connections()
                        from django.db import connection

                        with connection.cursor() as cursor:
                            # Ensure we read the latest committed data
                            cursor.execute("SET TRANSACTION ISOLATION LEVEL READ COMMITTED")
                            cursor.execute(
                                'SELECT account_id, copy_mode, copy_factor, account_type, dual_trade_enabled, multi_trade_count FROM "trading_accounts" WHERE account_id = %s',
                                [str(follower)],
                            )
                            row = cursor.fetchone()
                            if row:
                                (
                                    acct_id,
                                    acct_mode,
                                    acct_factor,
                                    acct_type,
                                    dual_trade,
                                    multi_trade_count,
                                ) = row
                                logger.info(
                                    f"[SQL] RAW SQL LOOKUP follower={follower}, found_account={acct_id}, type={acct_type}, mode={acct_mode}, factor={acct_factor}, dual_trade={dual_trade}, trade_count={multi_trade_count}"
                                )
                            else:
                                acct_mode = None
                                multi_trade_count = 1
                                acct_factor = None
                                acct_type = None
                                dual_trade = False
                                logger.warning(
                                    f"[WARNING] Follower account {follower} NOT FOUND in database"
                                )

                        if acct_mode == "fixed_multiple":
                            try:
                                factor = float(acct_factor or 1.0)
                                calculated_volume = float(base_volume) * factor
                                logger.info(
                                    f"[OK] APPLYING FIXED MULTIPLE: base={base_volume} * factor={factor} = {calculated_volume}"
                                )
                            except Exception as ex:
                                logger.error(f"[ERROR] Error applying fixed multiple: {ex}")
                        logger.debug(
                            f"Fixed-mult position check - master={order.Login}, follower={follower}, acct_mode={acct_mode}, acct_factor={acct_factor}, base_volume={base_volume}, computed_volume={calculated_volume}"
                        )
                    except Exception as e:
                        logger.warning(
                            f"Could not lookup follower account for fixed-mult position check: {e}"
                        )

                    # Scale to symbol min volume increments and ensure minimum
                    try:
                        if symbol_min_vol:
                            scaled = int(calculated_volume / symbol_min_vol) * symbol_min_vol
                        else:
                            scaled = 0
                    except Exception:
                        scaled = 0
                    request.Volume = max(symbol_min_vol, scaled) if scaled > 0 else symbol_min_vol

                    logger.debug(
                        f"Follower {follower}: leader_balance={leader_balance}, follower_balance={follower_balance}, "
                        f"base_volume={base_volume}, calculated_volume={calculated_volume:.6f}, symbol_min_vol={symbol_min_vol}, final_volume={request.Volume}"
                    )
                    if request.Volume > 0:
                        # Determine how many times to copy based on multi_trade_count setting
                        num_copies = max(1, min(10, int(multi_trade_count)))
                        logger.info(
                            f"[MULTI-TRADE] Multi trade mode: {'ENABLED' if num_copies > 1 else 'DISABLED'} - will execute {num_copies} trade(s) for follower {follower}"
                        )

                        for trade_num in range(1, num_copies + 1):
                            # Create unique comment and dedupe key for each copy
                            if num_copies > 1:
                                trade_comment = f"{comment}_trade{trade_num}"
                                trade_dedupe_key = f"{dedupe_key}_trade{trade_num}"
                            else:
                                trade_comment = comment
                                trade_dedupe_key = dedupe_key

                            # Enhanced deduplicate: ensure follower doesn't already have a position with same comment or base comment
                            try:
                                exists = False
                                existing_comments = []
                                for p in manager.PositionGet(follower):
                                    existing_comments.append(p.Comment)
                                    # Check for exact comment match
                                    if p.Comment == trade_comment:
                                        exists = True
                                        break
                                    # Also check for similar comments to prevent near-duplicates
                                    if trade_comment.startswith(p.Comment) or p.Comment.startswith(
                                        trade_comment.split("_trade")[0]
                                    ):
                                        base_comment = trade_comment.split("_trade")[0]
                                        if p.Comment.startswith(base_comment):
                                            # Count existing trades for this base comment
                                            existing_count = len(
                                                [
                                                    c
                                                    for c in existing_comments
                                                    if c.startswith(base_comment)
                                                ]
                                            )
                                            if existing_count >= num_copies:
                                                exists = True
                                                logger.info(
                                                    f"Skipping position creation {trade_num}/{num_copies} for follower {follower}: already have {existing_count} positions for base comment {base_comment}"
                                                )
                                                break
                                if exists:
                                    logger.debug(
                                        f"Skipping position creation {trade_num}/{num_copies} for follower {follower}: existing position with comment {trade_comment}"
                                    )
                                    continue
                            except Exception as e:
                                logger.warning(
                                    f"Could not check existing positions for follower {follower}: {e}"
                                )

                            # Pessimistically reserve this dedupe key so other threads/processes
                            # won't attempt the same copy while this one is in-flight.
                            with _recent_copies_lock:
                                now_ts = datetime.now().timestamp()
                                # cleanup expired entries
                                expired = [
                                    k
                                    for k, v in _recent_copies.items()
                                    if now_ts - v > RECENT_COPY_TTL
                                ]
                                for k in expired:
                                    _recent_copies.pop(k, None)
                                if trade_dedupe_key in _recent_copies:
                                    # someone else already copied recently
                                    logger.debug(
                                        f"Trade {trade_num}/{num_copies} already in progress for follower {follower}"
                                    )
                                    continue
                                # reserve key (mark in-progress)
                                _recent_copies[trade_dedupe_key] = now_ts

                            # Update request comment for this specific trade
                            # IMPORTANT: Create a new request object for each trade to avoid race conditions
                            trade_request = self.order_to_req(
                                order, MT5Manager.MTRequest(manager), "marketOpen"
                            )
                            trade_request.Login = follower
                            trade_request.Comment = trade_comment
                            trade_request.Volume = request.Volume  # Use the calculated volume
                            trade_request.Symbol = request.Symbol
                            trade_request.Action = request.Action
                            try:
                                trade_request.DedupeKey = trade_dedupe_key
                            except Exception:
                                pass

                            # submit the send to the shared executor
                            logger.info(
                                f"[EXECUTE] Executing trade {trade_num}/{num_copies} for follower {follower} (master_pos={master_pos_id}, dedupe={trade_dedupe_key}, volume={trade_request.Volume})"
                            )
                            fut = COPY_EXECUTOR.submit(
                                self.execute_trade, trade_request, follower, "copy position", force
                            )
                            futures[fut] = (follower, trade_dedupe_key, trade_comment)
                except Exception as e:
                    # logger.error(f"Exception in copy_position_to_followers for follower {follower}: {e}")
                    pass
            # collect results as they complete
            try:
                for fut in as_completed(futures):
                    follower, dedupe_key, comment = futures[fut]
                    try:
                        success = fut.result()
                    except Exception as e:
                        success = False
                        logger.error(f"Copy send raised for follower {follower}: {e}")

                    if success:
                        any_success = True
                        verified = False
                        master_pos_str = str(master_pos_id) if master_pos_id else ""
                        master_login_str = str(order.Login) if getattr(order, "Login", None) else ""
                        try:
                            for attempt in range(5):
                                try:
                                    for p in manager.PositionGet(follower):
                                        pos_comment = str(getattr(p, "Comment", ""))
                                        if (
                                            pos_comment
                                            and (
                                                pos_comment == comment
                                                or comment.startswith(pos_comment)
                                                or pos_comment.startswith(comment)
                                                or (
                                                    master_pos_str and master_pos_str in pos_comment
                                                )
                                            )
                                        ) or (p.Symbol == order.Symbol):
                                            verified = True
                                            logger.info(
                                                f"[VERIFIED-SUCCESS] Verified position {p.Position} for follower {follower} (comment='{pos_comment}', symbol={p.Symbol})"
                                            )
                                            break
                                    if verified:
                                        break
                                except Exception:
                                    pass
                                sleep(0.5)
                        except Exception:
                            verified = False

                        if verified:
                            any_success = True
                            with _recent_copies_lock:
                                _recent_copies[dedupe_key] = datetime.now().timestamp()
                        else:
                            # DealerSend succeeded; broker dealer execution is processing asynchronously on broker server
                            logger.info(
                                f"[COPY-SENT-ASYNC] Trade request submitted successfully for follower {follower} (comment={comment}). Pending broker dealer execution."
                            )
                            any_success = True
                            with _recent_copies_lock:
                                _recent_copies[dedupe_key] = datetime.now().timestamp()
                    else:
                        # remove reservation so future attempts may retry
                        with _recent_copies_lock:
                            _recent_copies.pop(dedupe_key, None)

            finally:
                # using shared COPY_EXECUTOR; no local executor to shut down
                pass

            # If any follower succeeded, mark the master position processed and create DB marker
            try:
                if any_success and master_pos_id:
                    with _recent_positions_lock:
                        _recent_positions[master_pos_id] = datetime.now().timestamp()
                    try:
                        from adminPanel.models import MT5SendDedup

                        safe_key = "".join(
                            [
                                c if c.isalnum() or c in ("-", "") else ""
                                for c in f"master_done_{master_pos_id}"
                            ]
                        )
                        try:
                            obj, created = MT5SendDedup.objects.get_or_create(key=safe_key)
                            # Only log when a new DB marker was actually created to avoid noisy repeated logs
                            if created:
                                logger.debug(
                                    f"DB master_done marker created for master_pos {master_pos_id}"
                                )
                        except Exception:
                            pass
                    except Exception:
                        pass
            except Exception:
                pass

        def get_followers(self, loginID):
            now_ts = time()
            with _follower_cache_lock:
                if loginID in _follower_cache:
                    cached, ts = _follower_cache[loginID]
                    if now_ts - ts < FOLLOWER_CACHE_TTL:
                        return cached

            leader = get_cached_user(manager, loginID)
            if not leader or not str(leader.Agent).startswith(AGENT_CODE_PREFIX):
                return []
            potential_followers = [
                user.Login for user in manager.UserGetByGroup(leader.Group) if user.Agent == loginID
            ]

            active_followers = []
            try:
                from django.db import connection, close_old_connections

                close_old_connections()

                with connection.cursor() as cursor:
                    for follower_id in potential_followers:
                        cursor.execute(
                            'SELECT investor_allow_copy FROM "trading_accounts" WHERE account_id = %s AND account_type = %s',
                            [str(follower_id), "Investor"],
                        )
                        row = cursor.fetchone()
                        if row and row[0]:
                            active_followers.append(follower_id)
                        elif not row:
                            active_followers.append(follower_id)
            except Exception as e:
                logger.warning(
                    f"Error checking investor_allow_copy status, using all followers: {e}"
                )
                active_followers = potential_followers

            with _follower_cache_lock:
                _follower_cache[loginID] = (active_followers, now_ts)

            return active_followers

        def OnOrderUpdate(self, order):
            global last_activity_ts
            last_activity_ts = time()
            if (
                str(manager.UserGet(order.Login).Agent).startswith(AGENT_CODE_PREFIX)
                and order.State == 1
            ):
                # Skip market orders (Type 0 = BUY, Type 1 = SELL).
                # Market positions are copied via OnOrderDelete → copy_position_to_followers.
                # Copying them here too causes duplicate trades since both paths fire
                # for the same market order event.
                if getattr(order, "Type", 0) < 2:
                    return
                logger.debug(f"Order {order.Order} updated, attempting to copy to followers")
                self.copy_order_to_followers(order)

                def process_pending_orders():
                    sleep(0.5)
                    # Only rescan pending order types to avoid re-copying market orders
                    pending_order_list = [
                        i
                        for i in manager.OrderGetOpen(order.Login)
                        if i.State == 1 and getattr(i, "Type", 0) >= 2
                    ]
                    with ThreadPoolExecutor() as executor:
                        executor.map(
                            lambda pending_order: self.copy_order_to_followers(pending_order),
                            pending_order_list,
                        )

                threading.Thread(target=process_pending_orders).start()

        def OnOrderDelete(self, order):
            global last_activity_ts
            last_activity_ts = time()
            if str(manager.UserGet(order.Login).Agent).startswith(AGENT_CODE_PREFIX):
                if order.State == 4 and order.ActivationMode == 0:
                    # Parallel Event Router: Dispatch Manager A, B, C... concurrently to COPY_EXECUTOR
                    ManagerEventRouter.route_position_copy(self, order)
                elif order.State in {1, 2}:
                    # logger.debug(f"Pending order {order.Order} deleted, attempting to remove from followers")
                    COPY_EXECUTOR.submit(self.delete_order_to_followers, order)

    class PositionSink:
        def OnPositionUpdate(self, position):
            global last_activity_ts
            last_activity_ts = time()
            if str(manager.UserGet(position.Login).Agent).startswith(AGENT_CODE_PREFIX):
                # logger.debug(f"Position {position.Position} updated, attempting to modify for followers")
                for follower in self.get_followers(position.Login):
                    for pos in manager.PositionGet(follower):
                        # Match the comment format used when copying positions: "{leader}_{position_id}"
                        if pos.Comment == f"{position.Login}_{position.Position}":
                            leader_balance = manager.UserGet(position.Login).Balance
                            follower_balance = manager.UserGet(follower).Balance
                            symbol_min_vol = manager.SymbolGet(pos.Symbol).VolumeMin
                            # Calculate proportional volume for position update (default: balance ratio)
                            try:
                                calculated_volume = position.Volume * (
                                    follower_balance / leader_balance
                                )
                            except Exception:
                                calculated_volume = 0

                            # If follower account is configured for fixed_multiple, override with factor
                            try:
                                close_old_connections()
                                from django.db import connection

                                with connection.cursor() as cursor:
                                    # Ensure we read the latest committed data
                                    cursor.execute("SET TRANSACTION ISOLATION LEVEL READ COMMITTED")
                                    cursor.execute(
                                        'SELECT account_id, copy_mode, copy_factor, account_type, dual_trade_enabled, multi_trade_count FROM "trading_accounts" WHERE account_id = %s',
                                        [str(follower)],
                                    )
                                    row = cursor.fetchone()
                                    if row:
                                        (
                                            acct_id,
                                            acct_mode,
                                            acct_factor,
                                            acct_type,
                                            dual_trade,
                                            multi_trade_count,
                                        ) = row
                                        logger.info(
                                            f"[SQL] RAW SQL LOOKUP (position update) follower={follower}, found_account={acct_id}, type={acct_type}, mode={acct_mode}, factor={acct_factor}, dual_trade={dual_trade}, trade_count={multi_trade_count}"
                                        )
                                    else:
                                        acct_mode = None
                                        acct_factor = None
                                        dual_trade = False
                                        multi_trade_count = 1
                                        logger.warning(
                                            f"[WARNING] Follower account {follower} NOT FOUND in database (position update)"
                                        )

                                if acct_mode == "fixed_multiple":
                                    try:
                                        factor = float(acct_factor or 1.0)
                                        calculated_volume = float(position.Volume) * factor
                                        logger.info(
                                            f"[OK] APPLYING FIXED MULTIPLE (position update): base={position.Volume} * factor={factor} = {calculated_volume}"
                                        )
                                    except Exception as ex:
                                        logger.error(
                                            f"[ERROR] Error applying fixed multiple (position update): {ex}"
                                        )
                                logger.debug(
                                    f"Fixed-mult update check - master={position.Login}, follower={follower}, acct_mode={acct_mode}, acct_factor={acct_factor}, master_pos_volume={position.Volume}, computed_volume={calculated_volume}"
                                )
                            except Exception as e:
                                logger.warning(
                                    f"Could not lookup follower account for fixed-mult update check: {e}"
                                )

                            # Ensure minimum volume of symbol_min_vol is applied where appropriate
                            try:
                                if symbol_min_vol:
                                    pos.Volume = max(
                                        symbol_min_vol,
                                        int(calculated_volume / symbol_min_vol) * symbol_min_vol,
                                    )
                                else:
                                    pos.Volume = calculated_volume
                            except Exception:
                                pos.Volume = calculated_volume
                            pos.PriceSL = position.PriceSL
                            pos.PriceTP = position.PriceTP
                            if pos.Volume > 0:
                                self.update_position_in_thread(pos)

        def update_position_in_thread(self, pos):
            def perform_update():
                try:
                    if manager.PositionUpdate(pos):
                        logger.info(f"Position successfully updated for follower {pos.Login}")
                    else:
                        logger.error(f"Failed to update position for follower {pos.Login}")
                except Exception as e:
                    logger.error(f"Exception in perform_update for position {pos.Position}: {e}")

            threading.Thread(target=perform_update).start()

        def OnPositionDelete(self, position):
            global last_activity_ts
            last_activity_ts = time()
            if str(manager.UserGet(position.Login).Agent).startswith(AGENT_CODE_PREFIX):
                ManagerEventRouter.route_position_close(self, position)

        def execute_manager_position_close(self, position):
            try:
                master_pos_id = getattr(position, "Position", None)
                if master_pos_id:
                    with _recent_positions_lock:
                        _recent_positions[master_pos_id] = datetime.now().timestamp()
                    try:
                        from adminPanel.models import MT5SendDedup

                        safe_key = "".join(
                            [
                                c if c.isalnum() or c in ("-", "") else ""
                                for c in f"master_closed_{master_pos_id}"
                            ]
                        )
                        try:
                            obj, created = MT5SendDedup.objects.get_or_create(key=safe_key)
                            if created:
                                logger.debug(
                                    f"DB master_closed marker created for master_pos {master_pos_id}"
                                )
                        except Exception:
                            pass
                    except Exception:
                        pass
            except Exception:
                pass

            for follower in self.get_followers(position.Login):
                for pos in manager.PositionGet(follower):
                    expected_comment = f"{position.Login}_{position.Position}"
                    is_match = pos.Comment == expected_comment or pos.Comment.startswith(
                        f"{expected_comment}_trade"
                    )

                    if is_match:
                        logger.info(
                            f"[CLOSE] Closing follower position: {follower} position={pos.Position} comment={pos.Comment}"
                        )
                        request = MT5Manager.MTRequest(manager)
                        request.Action = 200
                        request.PriceOrder = pos.PriceCurrent
                        request.Symbol = position.Symbol
                        request.Login = follower
                        request.Type = int(not pos.Action)
                        request.Position = pos.Position
                        request.Volume = pos.Volume
                        try:
                            request.Comment = pos.Comment
                        except Exception:
                            pass
                        self.execute_close_with_retry(request, follower, max_retries=5)

        def execute_close_with_retry(self, request, follower_id: int, max_retries: int = 5):
            """Reliable close retry handler for transient broker/dealer failures."""

            def perform_close():
                try:
                    close_old_connections()
                except Exception:
                    pass

                pos_ticket = getattr(request, "Position", 0)
                comment = str(getattr(request, "Comment", ""))
                key = f"close_position_{follower_id}_{pos_ticket}_{comment}"
                safe_key = "".join([c if c.isalnum() or c in ("-", "_") else "" for c in key])

                with _in_flight_lock:
                    if safe_key in _in_flight_trades:
                        logger.debug(
                            f"[CLOSE-INFLIGHT] Close operation for {safe_key} already in progress."
                        )
                        return
                    _in_flight_trades.add(safe_key)

                try:
                    for attempt in range(1, max_retries + 1):
                        pos_found = None
                        try:
                            for p in manager.PositionGet(follower_id):
                                if p.Position == pos_ticket or (comment and p.Comment == comment):
                                    pos_found = p
                                    break
                        except Exception:
                            pass

                        if not pos_found:
                            logger.info(
                                f"[CLOSE-VERIFIED] Follower {follower_id} position {pos_ticket} verified closed or not found."
                            )
                            return

                        if pos_found:
                            request.PriceOrder = pos_found.PriceCurrent
                            request.Position = pos_found.Position
                            request.Volume = pos_found.Volume

                        send_start = time()
                        success = manager.DealerSend(request, sink)
                        elapsed = (time() - send_start) * 1000.0

                        if success:
                            logger.info(
                                f"[CLOSE-SUCCESS] Closed position {pos_ticket} for follower {follower_id} on attempt {attempt} in {elapsed:.1f}ms"
                            )
                            with _recent_copies_lock:
                                _recent_copies[safe_key] = time()
                            return

                        logger.warning(
                            f"[CLOSE-RETRY] Follower {follower_id} close attempt {attempt}/{max_retries} failed. Retrying in {0.2 * (2**attempt):.2f}s..."
                        )
                        sleep(0.2 * (2**attempt))

                    logger.error(
                        f"[CLOSE-FAILED] Max retries ({max_retries}) reached. Unable to close position {pos_ticket} for follower {follower_id}"
                    )
                finally:
                    with _in_flight_lock:
                        _in_flight_trades.discard(safe_key)

            COPY_EXECUTOR.submit(perform_close)

        def execute_trade(self, request, follower_id, operation_type, force=False):
            def perform_trade(force_flag=False):
                try:
                    close_old_connections()
                except Exception:
                    pass

                comment = str(getattr(request, "Comment", ""))
                raw_key = getattr(request, "DedupeKey", f"{operation_type}_{follower_id}_{comment}")
                safe_key = "".join(
                    [c if c.isalnum() or c in ("-", "_") else "" for c in str(raw_key)]
                )

                if mt5_connection_state == "DISCONNECTED":
                    logger.warning(
                        f"[COPY_BLOCKED_DISCONNECTED] MT5 disconnected. Skipping trade execution for follower {follower_id}."
                    )
                    return

                with _in_flight_lock:
                    if safe_key in _in_flight_trades:
                        logger.info(
                            f"[COPY_DUPLICATE_BLOCKED] trade={safe_key} follower={follower_id} reason=IN_FLIGHT_EXECUTION"
                        )
                        return
                    _in_flight_trades.add(safe_key)

                try:
                    try:
                        from adminPanel.models import MT5SendDedup

                        obj = MT5SendDedup.objects.filter(key=safe_key).first()
                        if not force and obj:
                            try:
                                age = (datetime.now() - obj.created_at).total_seconds()
                            except Exception:
                                age = 0
                            if age < RECENT_COPY_TTL:
                                logger.info(
                                    f"[COPY_DUPLICATE_BLOCKED] trade={safe_key} follower={follower_id} reason=DB_DEDUPE_EXISTS"
                                )
                                return
                    except Exception:
                        pass

                    if not force and not acquire_db_advisory_lock(safe_key):
                        logger.info(
                            f"[COPY_DUPLICATE_BLOCKED] trade={safe_key} follower={follower_id} reason=ADVISORY_LOCK_HELD"
                        )
                        return

                    try:
                        send_start = time()
                        success = manager.DealerSend(request, sink)
                        send_elapsed = (time() - send_start) * 1000.0

                        if success:
                            logger.info(
                                f"[COPY_SUCCESS] trade={safe_key} follower={follower_id} op={operation_type} latency={send_elapsed:.1f}ms dealer=SUCCESS"
                            )
                            try:
                                from adminPanel.models import MT5SendDedup

                                MT5SendDedup.objects.get_or_create(key=safe_key)
                            except Exception:
                                pass
                            with _recent_copies_lock:
                                _recent_copies[safe_key] = time()
                        else:
                            try:
                                last = MT5Manager.LastError()
                                logger.error(
                                    f"[COPY_FAILED] trade={safe_key} follower={follower_id} op={operation_type} latency={send_elapsed:.1f}ms error={last}"
                                )
                            except Exception:
                                logger.error(
                                    f"[COPY_FAILED] trade={safe_key} follower={follower_id} op={operation_type} latency={send_elapsed:.1f}ms"
                                )
                    finally:
                        release_db_advisory_lock(safe_key)

                except Exception as e:
                    logger.error(f"Exception in perform_trade for follower {follower_id}: {e}")
                finally:
                    with _in_flight_lock:
                        _in_flight_trades.discard(safe_key)

            COPY_EXECUTOR.submit(perform_trade, force)

        def get_followers(self, loginID):
            now_ts = time()
            with _follower_cache_lock:
                if loginID in _follower_cache:
                    cached, ts = _follower_cache[loginID]
                    if now_ts - ts < FOLLOWER_CACHE_TTL:
                        return cached

            leader = get_cached_user(manager, loginID)
            if not leader or not str(leader.Agent).startswith(AGENT_CODE_PREFIX):
                return []
            potential_followers = [
                user.Login for user in manager.UserGetByGroup(leader.Group) if user.Agent == loginID
            ]

            active_followers = []
            try:
                from django.db import connection, close_old_connections

                close_old_connections()

                with connection.cursor() as cursor:
                    for follower_id in potential_followers:
                        cursor.execute(
                            'SELECT investor_allow_copy FROM "trading_accounts" WHERE account_id = %s AND account_type = %s',
                            [str(follower_id), "Investor"],
                        )
                        row = cursor.fetchone()
                        if row and row[0]:
                            active_followers.append(follower_id)
                        elif not row:
                            active_followers.append(follower_id)
            except Exception as e:
                logger.warning(
                    f"Error checking investor_allow_copy status, using all followers: {e}"
                )
                active_followers = potential_followers

            with _follower_cache_lock:
                _follower_cache[loginID] = (active_followers, now_ts)

            return active_followers

    logger.info("Starting subscription and connection process")
    # Use an indefinite retry loop with exponential backoff so the script
    # does not exit on transient failures. This satisfies the "never exit"
    # requirement while still backing off on repeated failures.
    attempt = 0
    dealsink = DealSink()
    orderSink = OrderSink()
    positionSink = PositionSink()

    while True:
        try:
            if not manager.OrderSubscribe(orderSink):
                logger.error(f"Failed to subscribe to orders: {MT5Manager.LastError()}")
                break
            if not manager.PositionSubscribe(positionSink):
                logger.error(f"Failed to subscribe to positions: {MT5Manager.LastError()}")
                break
            if not manager.DealSubscribe(dealsink):
                logger.error(f"Failed to subscribe to deals: {MT5Manager.LastError()}")
                break

            # Start a watcher thread that triggers state differential resync when events pause
            def resync_watcher():
                global _last_resync_ts
                while True:
                    try:
                        now_ts = time()
                        age = now_ts - last_activity_ts
                        if age > STALE_THRESHOLD and (now_ts - _last_resync_ts) > RESYNC_COOLDOWN:
                            _last_resync_ts = now_ts
                            try:
                                # Reconcile master and follower state cleanly
                                for i in range(manager.GroupTotal()):
                                    try:
                                        group = manager.GroupNext(i).Group
                                        if "demo" in group:
                                            continue
                                        for leader in manager.UserGetByGroup(group):
                                            if not str(leader.Agent).startswith(AGENT_CODE_PREFIX):
                                                continue
                                            followers = orderSink.get_followers(leader.Login)
                                            if not followers:
                                                continue

                                            # Differential scan: Copy only missing positions/orders without force=True
                                            try:
                                                master_orders = manager.OrderGetOpen(leader.Login)
                                                for ord in master_orders:
                                                    try:
                                                        orderSink.copy_order_to_followers(
                                                            ord, force=False
                                                        )
                                                    except Exception as e:
                                                        logger.debug(
                                                            f"Resync order check failed for leader {leader.Login}: {e}"
                                                        )

                                                master_positions = manager.PositionGet(leader.Login)
                                                for pos in master_positions:
                                                    try:
                                                        master_pos_id = getattr(
                                                            pos,
                                                            "Position",
                                                            getattr(
                                                                pos,
                                                                "PositionID",
                                                                getattr(pos, "Order", None),
                                                            ),
                                                        )
                                                        if not master_pos_id:
                                                            continue

                                                        now_ts = datetime.now().timestamp()
                                                        with _recent_positions_lock:
                                                            prev_processed = _recent_positions.get(
                                                                master_pos_id
                                                            )
                                                            if (
                                                                prev_processed
                                                                and now_ts - prev_processed
                                                                < RECENT_POSITION_TTL
                                                            ):
                                                                continue

                                                        expected_prefix = (
                                                            f"{leader.Login}_{master_pos_id}"
                                                        )
                                                        for follower in followers:
                                                            try:
                                                                follower_positions = (
                                                                    manager.PositionGet(follower)
                                                                )
                                                                already_exists = any(
                                                                    p.Comment
                                                                    and (
                                                                        p.Comment == expected_prefix
                                                                        or p.Comment.startswith(
                                                                            f"{expected_prefix}_trade"
                                                                        )
                                                                    )
                                                                    for p in follower_positions
                                                                )
                                                                if not already_exists:
                                                                    logger.info(
                                                                        f"[RESYNC-MISSING] Found missing position {master_pos_id} for follower {follower}. Copying..."
                                                                    )
                                                                    orderSink.copy_position_to_followers(
                                                                        pos, force=False
                                                                    )
                                                            except Exception as fe:
                                                                logger.debug(
                                                                    f"Resync check error for follower {follower}: {fe}"
                                                                )
                                                    except Exception as pe:
                                                        logger.debug(
                                                            f"Resync position check failed for leader {leader.Login}: {pe}"
                                                        )
                                            except Exception as e:
                                                logger.debug(
                                                    f"Resync scan failed for leader {leader.Login}: {e}"
                                                )
                                    except Exception:
                                        pass
                            except Exception as e:
                                logger.error(f"Error during state differential resync: {e}")
                        sleep(0.5)
                    except Exception:
                        sleep(0.5)

            watcher_thread = threading.Thread(target=resync_watcher, daemon=True)
            watcher_thread.start()
            # Keep the main subscription loop alive indefinitely. If the health
            # check fails, wait and retry instead of breaking out which would
            # cause the script to exit and daemon threads to be killed.
            while True:
                try:
                    if not checkingu():
                        # Reduce delay on health check failure
                        sleep(1)
                        continue
                    sleep(0.1)  # Reduced idle delay for faster response
                except Exception:
                    sleep(1)

        except Exception as e:
            # Log and backoff, but do NOT exit. Use exponential backoff to
            # avoid tight failure loops.
            attempt += 1
            backoff = min(300, (2 ** min(attempt, 6)))
            logger.error(
                f"Error during connection or subscription (attempt {attempt}): {e}. Backing off for {backoff}s"
            )
            sleep(backoff)
            # continue to retry indefinitely
            continue


if __name__ == "__main__":
    try:
        run_mam_script()
    finally:
        release_process_lock()
        print("🔓 MAM process lock released")
