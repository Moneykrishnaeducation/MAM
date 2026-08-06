import asyncio
import atexit
import concurrent.futures
import json
import logging
import os
import threading
import time
from datetime import datetime, timedelta

import MT5Manager
from django.core.cache import cache
from django.utils import timezone

from adminPanel.models import MT5GroupConfig, ServerSetting, TradeGroup, TradingAccount

logger = logging.getLogger(__name__)

FAILED_ACCOUNT_CACHE = {}
CACHE_EXPIRY_MINUTES = 5
MAX_ERROR_LOG_RATE = 10

GROUP_CONFIG = {}
try:
    config_path = os.path.join(os.path.dirname(__file__), "group_config.json")
    if os.path.exists(config_path):
        with open(config_path) as f:
            GROUP_CONFIG = json.load(f)
except Exception as e:
    logger.error(f"Failed to load group_config.json: {e}")

DEFAULT_GROUP = GROUP_CONFIG.get("default_group")

crights = MT5Manager.MTUser.EnUsersRights
account_create_rights = (
    crights.USER_RIGHT_ENABLED
    | crights.USER_RIGHT_PASSWORD
    | crights.USER_RIGHT_CONFIRMED
    | crights.USER_RIGHT_TRAILING
    | crights.USER_RIGHT_EXPERT
)
algo_disable_rights = (
    crights.USER_RIGHT_ENABLED
    | crights.USER_RIGHT_PASSWORD
    | crights.USER_RIGHT_CONFIRMED
    | crights.USER_RIGHT_TRAILING
)
algo_enable_rights = (
    crights.USER_RIGHT_ENABLED
    | crights.USER_RIGHT_PASSWORD
    | crights.USER_RIGHT_CONFIRMED
    | crights.USER_RIGHT_TRAILING
    | crights.USER_RIGHT_EXPERT
)
disable_account_rights = (
    crights.USER_RIGHT_PASSWORD
    | crights.USER_RIGHT_CONFIRMED
    | crights.USER_RIGHT_TRAILING
    | crights.USER_RIGHT_EXPERT
)
disable_trading_rights = (
    crights.USER_RIGHT_ENABLED
    | crights.USER_RIGHT_PASSWORD
    | crights.USER_RIGHT_CONFIRMED
    | crights.USER_RIGHT_TRAILING
    | crights.USER_RIGHT_EXPERT
    | crights.USER_RIGHT_TRADE_DISABLED
)
enable_trading_rights = (
    crights.USER_RIGHT_ENABLED
    | crights.USER_RIGHT_PASSWORD
    | crights.USER_RIGHT_CONFIRMED
    | crights.USER_RIGHT_TRAILING
    | crights.USER_RIGHT_EXPERT
)

def run_async(coro):
    """Run an async coroutine synchronously."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        # Use ThreadPoolExecutor to run the coroutine in a separate loop
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(asyncio.run, coro)
            return future.result()
    else:
        return asyncio.run(coro)

def ensure_connected(func):
    def wrapper(self, *args, **kwargs):
        if not self.manager:
            raise Exception("MT5 Manager is not connected. Please reconnect.")
        return func(self, *args, **kwargs)
    return wrapper

_real_manager_instance = None
_demo_manager_instance = None
_current_real_setting = None
_current_demo_setting = None
_manager_lock = threading.Lock()

# Separate RLock that serialises all raw MT5 SDK API calls.
# The MT5Manager C-extension is not documented as thread-safe, so every
# caller that touches the ManagerAPI object must hold this lock.
_mt5_api_lock = threading.RLock()


def _disconnect_instance_safe(instance, label: str = "") -> None:
    """
    Safely disconnect a MT5ManagerAPI wrapper object.

    Rules:
    - Must be called OUTSIDE _manager_lock to prevent lock-order inversions.
    - Acquires _mt5_api_lock for the raw SDK Disconnect() call.
    - Marks the wrapper as disconnected regardless of whether Disconnect() succeeds.
    - Never raises; logs failures at WARNING level.

    Args:
        instance: A MT5ManagerAPI wrapper object (has .manager and .connected).
        label:    Human-readable label for log messages (e.g. 'real', 'demo').
    """
    if instance is None:
        return
    try:
        instance.connected = False
    except Exception:
        pass
    try:
        raw = getattr(instance, "manager", None)
        if raw is not None:
            with _mt5_api_lock:
                raw.Disconnect()
            tag = f" [{label}]" if label else ""
            logger.info(f"[MT5]{tag} Old manager connection disconnected cleanly.")
    except Exception as ex:
        tag = f" [{label}]" if label else ""
        logger.warning(f"[MT5]{tag} Error during Disconnect(): {ex}")


def reset_manager_instance():
    """
    Reset the MT5 Manager singleton.

    Lifecycle contract:
    1. Snapshot existing instances under _manager_lock.
    2. Clear the singleton references and settings cache.
    3. Release _manager_lock.
    4. Disconnect old instances OUTSIDE the lock (avoids lock-order inversion).
    """
    global _real_manager_instance, _demo_manager_instance, _current_real_setting, _current_demo_setting

    # --- Step 1+2: snapshot and clear under assignment lock ----------
    with _manager_lock:
        old_real = _real_manager_instance
        old_demo = _demo_manager_instance
        _real_manager_instance = None
        _demo_manager_instance = None
        _current_real_setting = None
        _current_demo_setting = None
        cache.delete("mt5_manager_error")

        try:
            async def clear_groups():
                await MT5GroupConfig.all().update(is_enabled=False, last_sync=None)
            run_async(clear_groups())
            logger.info("Cleared cached MT5 trading groups - will re-sync from new manager")
            cache.delete("mt5_groups_sync")
            cache.delete("mt5_connection_status")
        except Exception as e:
            logger.warning(f"Error clearing MT5 groups cache: {e}")

        logger.info("MT5 Manager connection has been reset")

    # --- Step 3: disconnect OUTSIDE the assignment lock --------------
    _disconnect_instance_safe(old_real, "real")
    _disconnect_instance_safe(old_demo, "demo")



def get_shared_manager():
    """
    Return the raw ManagerAPI object from the cached real-server singleton.

    This is a zero-connection-overhead accessor — it returns whatever is
    already stored in ``_real_manager_instance`` without opening a new TCP
    session when connected. If no singleton exists yet or it is disconnected,
    it initializes/fetches the singleton via ``get_manager_instance(True)``.

    Returns the ManagerAPI object, or None if no live connection exists yet.
    """
    with _manager_lock:
        if _real_manager_instance and getattr(_real_manager_instance, "connected", False):
            return _real_manager_instance.manager

    # If singleton is not yet initialized or was disconnected, attempt to initialize/reconnect once
    try:
        instance = get_manager_instance(True)
        if instance and getattr(instance, "connected", False):
            return instance.manager
    except Exception as e:
        logger.warning(f"[MT5] get_shared_manager could not connect singleton: {e}")

    return None


def get_mt5_api_lock() -> threading.RLock:
    """
    Return the module-level RLock that serialises all raw MT5 SDK API calls.

    Any code that calls methods directly on the ManagerAPI object returned by
    ``get_shared_manager()`` must acquire this lock first:

        with get_mt5_api_lock():
            result = manager.UserAccountGet(login_id)

    Using an RLock (re-entrant) means the same thread can call into MT5 API
    from nested helper functions without deadlocking.
    """
    return _mt5_api_lock


def _shutdown_mt5_manager():
    """atexit handler — cleanly disconnect the shared MT5 Manager connections.

    Snapshots the current instances under _manager_lock, clears the globals,
    then releases the lock BEFORE calling Disconnect().  This avoids holding
    two locks simultaneously (_manager_lock + _mt5_api_lock), which would be
    a potential deadlock if another thread held _mt5_api_lock while waiting
    for _manager_lock.
    """
    global _real_manager_instance, _demo_manager_instance
    # Snapshot and clear under the assignment lock only.
    with _manager_lock:
        old_real = _real_manager_instance
        old_demo = _demo_manager_instance
        _real_manager_instance = None
        _demo_manager_instance = None

    # Disconnect outside the assignment lock via the shared safe helper.
    _disconnect_instance_safe(old_real, "real")
    _disconnect_instance_safe(old_demo, "demo")


atexit.register(_shutdown_mt5_manager)


def force_refresh_trading_groups():
    """Refresh MT5 trading groups using the shared singleton connection."""
    try:
        async def clear_groups():
            await MT5GroupConfig.all().update(is_enabled=False, last_sync=None)
        run_async(clear_groups())
        # Use the shared manager instead of creating a new MT5ManagerActions() connection.
        raw_manager = get_shared_manager()
        if raw_manager:
            # Wrap temporarily for sync_mt5_groups — reuse the existing connection.
            mt5_actions = MT5ManagerActions()
            if mt5_actions.manager:
                result = mt5_actions.sync_mt5_groups()
                return result
        return False
    except Exception as e:
        logger.error(f"Error force refreshing trading groups: {str(e)}")
        return False

def checkingu():
    return True

def should_log_error(login_id, error_type="account_not_found"):
    current_time = datetime.now()
    cache_key = f"{login_id}_{error_type}"
    if cache_key in FAILED_ACCOUNT_CACHE:
        last_logged, count = FAILED_ACCOUNT_CACHE[cache_key]
        if current_time - last_logged < timedelta(minutes=CACHE_EXPIRY_MINUTES):
            if count >= MAX_ERROR_LOG_RATE:
                return False
            FAILED_ACCOUNT_CACHE[cache_key] = (last_logged, count + 1)
            return count <= 2
        else:
            FAILED_ACCOUNT_CACHE[cache_key] = (current_time, 1)
            return True
    else:
        FAILED_ACCOUNT_CACHE[cache_key] = (current_time, 1)
        return True

def get_cached_account_data(login_id, data_type="balance"):
    cache_key = f"mt5_failed_{login_id}_{data_type}"
    return cache.get(cache_key)

def _remove_trading_account_from_db(login_id, reason=None):
    try:
        async def mark_inactive():
            updated = await TradingAccount.filter(account_id=str(login_id)).update(status="Disabled", is_enabled=False)
            return updated > 0
        updated = run_async(mark_inactive())
        if updated:
            logger.info(f"Marked TradingAccount inactive for missing MT5 account {login_id}. Reason: {reason}")
            return True
        return False
    except Exception as e:
        logger.error(f"Failed to mark TradingAccount inactive for login_id {login_id}: {e}")
        return False

def cache_failed_account_lookup(login_id, data_type="balance", cache_duration=300):
    cache_key = f"mt5_failed_{login_id}_{data_type}"
    cache.set(cache_key, True, cache_duration)

def get_cached_account_success(login_id):
    cache_key = f"mt5_success_{login_id}"
    return cache.get(cache_key)

def cache_account_success(login_id, balance, equity, cache_duration=30):
    cache_key = f"mt5_success_{login_id}"
    data = {"balance": balance, "equity": equity, "timestamp": time.time()}
    cache.set(cache_key, data, cache_duration)

class MT5ManagerAPI:
    def __init__(self):
        unique_id = str(os.getpid())
        base_directory = os.path.join(os.getcwd(), "mt5_instances")
        os.makedirs(base_directory, exist_ok=True)
        instance_directory = os.path.join(base_directory, unique_id)
        os.makedirs(instance_directory, exist_ok=True)
        MT5Manager.InitializeManagerAPIPath(
            module_path=os.path.dirname(MT5Manager.__file__),
            work_path=instance_directory
        )

        self.manager = MT5Manager.ManagerAPI()
        self.connected = False

    def connect(self, address, login, password, mode, timeout):
        if self.manager.Connect(address, login, password, mode, timeout):
            self.connected = True
            return self.manager
        else:
            error_message = f"Failed to connect to MT5 Manager: {MT5Manager.LastError()}"
            logger.error(error_message)
            self.connected = False
            raise Exception(error_message)

def get_manager_instance(server_type: bool = True):
    if not checkingu():
        return None

    try:
        return _get_manager_instance_sync_with_cleanup(server_type)
    except Exception as e:
        logger.error(f"Unexpected error in get_manager_instance: {e}")
        raise

def _get_manager_instance_sync(server_type: bool = True):
    """
    Return the live MT5ManagerAPI singleton, connecting only when necessary.

    Lock safety rules:
    - DB queries (`ServerSetting.filter`) run OUTSIDE `_manager_lock`.
    - MT5 `.connect()` network call runs OUTSIDE `_manager_lock`.
    - `_manager_lock` is held ONLY to inspect and update in-memory global pointers.
    """
    global _real_manager_instance, _demo_manager_instance, _current_real_setting, _current_demo_setting

    # 1. Fetch latest DB settings OUTSIDE the lock (no lock held during DB query)
    async def get_setting():
        from backendPanel.database import ensure_db_initialized
        await ensure_db_initialized()
        return await ServerSetting.filter(server_type=server_type).order_by("-created_at").first()

    try:
        latest_setting = run_async(get_setting())
    except Exception as db_err:
        logger.error(f"Failed to fetch server setting for server_type={server_type}: {db_err}")
        raise Exception(f"Failed to fetch server setting: {db_err}")

    if not latest_setting:
        raise Exception(f"No server settings found for server_type={server_type}")

    # 2. Fast-path check under _manager_lock
    with _manager_lock:
        if server_type:
            current_instance = _real_manager_instance
            current_setting  = _current_real_setting
        else:
            current_instance = _demo_manager_instance
            current_setting  = _current_demo_setting

        if (
            current_instance is not None
            and getattr(current_instance, "connected", False)
            and current_setting == latest_setting
        ):
            return current_instance

    # 3. Connection is missing, disconnected, or setting changed.
    # Connect NEW instance OUTSIDE _manager_lock (no lock held during MT5 network connect)
    new_instance = MT5ManagerAPI()
    try:
        new_instance.connect(
            address=latest_setting.get_decrypted_server_ip(),
            login=int(latest_setting.real_account_login),
            password=latest_setting.get_decrypted_real_account_password(),
            mode=MT5Manager.ManagerAPI.EnPumpModes.PUMP_MODE_FULL,
            timeout=120000,
        )
    except Exception as connect_err:
        try:
            new_instance.connected = False
        except Exception:
            pass
        error_message = f"Failed to connect to MT5 Manager: {connect_err}"
        logger.error(error_message)
        raise Exception(error_message)

    # 4. Connect succeeded — atomically swap singleton reference under _manager_lock
    old_to_disconnect = None
    with _manager_lock:
        if server_type:
            old_to_disconnect = _real_manager_instance
            _real_manager_instance = new_instance
            _current_real_setting  = latest_setting
        else:
            old_to_disconnect = _demo_manager_instance
            _demo_manager_instance = new_instance
            _current_demo_setting  = latest_setting

        logger.info(
            f"Connected to {'real' if server_type else 'demo'} MT5 server "
            f"(login={latest_setting.real_account_login})"
        )

    # 5. Cleanly disconnect old instance OUTSIDE _manager_lock
    if old_to_disconnect is not None and old_to_disconnect is not new_instance:
        label = "real" if server_type else "demo"
        logger.info(f"[MT5] [{label}] Singleton replaced — disconnecting old connection.")
        _disconnect_instance_safe(old_to_disconnect, label)

    return new_instance


def _get_manager_instance_sync_with_cleanup(server_type: bool = True):
    """Compatibility wrapper around _get_manager_instance_sync."""
    return _get_manager_instance_sync(server_type)


class MT5ManagerActions:
    def __init__(self, server_type: bool = True):
        self.manager = None
        self.connection_error = None
        self.server_type = server_type
        self._equity_monitors = {}
        try:
            manager_instance = get_manager_instance(server_type)
            if manager_instance:
                self.manager = manager_instance.manager
            else:
                self.connection_error = "Manager instance is None"
                logger.error("MT5 Manager instance is None")
        except Exception as e:
            self.connection_error = str(e)
            logger.error(f"MT5 Manager initialization failed: {str(e)}")
            cache.set("mt5_manager_error", str(e), 300)

    def get_closed_trades(self, login_id, from_date=None, to_date=None):
        if not self.manager:
            raise Exception("MT5 Manager not connected")
        if to_date is None:
            to_date = datetime.now()
        if from_date is None:
            from_date = to_date - timedelta(days=365)

        try:
            numeric_login_id = int(login_id)
        except (ValueError, TypeError):
            logger.warning(f"Skipping non-numeric account ID: {login_id}")
            return []

        deals = self.manager.DealRequest(numeric_login_id, from_date, to_date)
        if deals is False or deals is None or isinstance(deals, bool):
            return []

        closed_deals = []
        for d in deals:
            action = getattr(d, "Action", None)
            entry = getattr(d, "Entry", None)
            symbol = getattr(d, "Symbol", None)
            volume_closed = getattr(d, "VolumeClosed", 0)
            if entry == 1 and symbol and str(symbol).strip() != "" and volume_closed and float(volume_closed) > 0 and action in (0, 1):
                closed_deals.append(d)
        return closed_deals

    def get_open_positions(self, login_id: int):
        """Fetch all live open positions for a given MT5 trading account ID."""
        if not self.manager:
            raise Exception("MT5 Manager not connected")

        try:
            numeric_login_id = int(login_id)
        except (ValueError, TypeError):
            logger.warning(f"Skipping non-numeric account ID for positions: {login_id}")
            return []

        raw_positions = self.manager.PositionGet(numeric_login_id)
        if not raw_positions or isinstance(raw_positions, bool):
            return []

        positions = []
        for pos in raw_positions:
            try:
                ticket = str(getattr(pos, "Position", getattr(pos, "Ticket", "")))
                symbol = str(getattr(pos, "Symbol", ""))
                action = getattr(pos, "Action", 0)
                pos_type = "Buy" if action == 0 else "Sell"
                volume_raw = float(getattr(pos, "Volume", 0))
                volume = round(volume_raw / 10000.0, 4) if volume_raw >= 1.0 else volume_raw
                price_open = float(getattr(pos, "PriceOpen", 0.0))
                price_current = float(getattr(pos, "PriceCurrent", price_open))
                sl = float(getattr(pos, "PriceSL", 0.0))
                tp = float(getattr(pos, "PriceTP", 0.0))
                profit = float(getattr(pos, "Profit", 0.0))
                swap = float(getattr(pos, "Storage", getattr(pos, "Swap", 0.0)))
                time_create = getattr(pos, "TimeCreate", 0)
                if time_create:
                    open_time = datetime.fromtimestamp(time_create).strftime("%Y-%m-%d %H:%M:%S")
                else:
                    open_time = ""
                comment = str(getattr(pos, "Comment", ""))

                positions.append({
                    "ticket": ticket,
                    "symbol": symbol,
                    "type": pos_type,
                    "volume": volume,
                    "open_price": price_open,
                    "current_price": price_current,
                    "sl": sl,
                    "tp": tp,
                    "profit": profit,
                    "swap": swap,
                    "open_time": open_time,
                    "comment": comment,
                })
            except Exception as e:
                logger.debug(f"Error parsing position object for account {login_id}: {e}")

        return positions

    def add_new_account(self, group_name=None, leverage=100, client=None, master_password=None, investor_password=None, agent=0):
        effective_group = group_name if group_name else DEFAULT_GROUP
        if not self.manager:
            raise Exception("MT5 Manager not connected")

        user = MT5Manager.MTUser(self.manager)
        user.Group = str(effective_group)
        user.Leverage = int(leverage)
        user.FirstName = client.name
        user.LastName = ""
        user.EMail = client.email
        user.Country = getattr(client, "country", "United States")
        user.Phone = getattr(client, "phone", "")
        user.Agent = agent
        user.Rights = account_create_rights

        if not self.manager.UserAdd(user, master_password, investor_password):
            return False
        else:
            login_id = user.Login
            try:
                self.change_leverage(login_id, user.Leverage)
            except Exception as e:
                logger.error(f"Error setting leverage for login {login_id}: {e}")
            return login_id

    @ensure_connected
    def deposit_funds(self, login_id, amount, comment):
        try:
            login_id = int(login_id)
            amount = float(amount)
            comment = str(comment)
        except (ValueError, TypeError) as e:
            logger.error(f"Type conversion error in deposit_funds: {e}")
            return False

        if amount <= 0:
            return False

        return self._handle_funds_operation(login_id, amount, comment, MT5Manager.MTDeal.EnDealAction.DEAL_BALANCE, "Deposit")

    @ensure_connected
    def withdraw_funds(self, login_id, amount, comment):
        if abs(amount) <= 0:
            return False
        return self._handle_funds_operation(login_id, -abs(amount), comment, MT5Manager.MTDeal.EnDealAction.DEAL_BALANCE, "Withdrawal")

    @ensure_connected
    def credit_in_funds(self, login_id, amount, comment):
        if amount <= 0:
            return False
        return self._handle_funds_operation(login_id, amount, comment, MT5Manager.MTDeal.EnDealAction.DEAL_CREDIT, "Credit-In")

    @ensure_connected
    def credit_out_funds(self, login_id, amount, comment):
        if abs(amount) <= 0:
            return False
        return self._handle_funds_operation(login_id, -abs(amount), comment, MT5Manager.MTDeal.EnDealAction.DEAL_CREDIT, "Credit-Out")

    @ensure_connected
    def change_leverage(self, login_id, leverage):
        try:
            login_id = int(login_id)
            leverage = int(leverage)
        except (ValueError, TypeError) as e:
            logger.error(f"Type conversion error in change_leverage: {e}")
            return False

        user = self.manager.UserGet(login_id)
        if user:
            user.Leverage = leverage
            if self.manager.UserUpdate(user):
                return True
        return False

    @ensure_connected
    def change_password(self, login_id, new_password, password_type="investor"):
        """Change master or investor password for an MT5 trading account."""
        try:
            login_id = int(login_id)
            new_pwd = str(new_password)
        except (ValueError, TypeError) as e:
            logger.error(f"Type conversion error in change_password: {e}")
            return False

        if not self.manager:
            return False

        is_investor = str(password_type).lower() in ("investor", "1")
        pwd_type_val = 1 if is_investor else 0
        try:
            if hasattr(MT5Manager, "MTUser") and hasattr(MT5Manager.MTUser, "EnUserPasswordType"):
                pwd_type_val = (
                    MT5Manager.MTUser.EnUserPasswordType.USER_PASS_INVESTOR
                    if is_investor
                    else MT5Manager.MTUser.EnUserPasswordType.USER_PASS_MAIN
                )
        except Exception as e:
            logger.debug(f"[MT5] EnUserPasswordType lookup error: {e}")

        # 1. Try UserPasswordChange(type, login, password)
        try:
            res = self.manager.UserPasswordChange(pwd_type_val, login_id, new_pwd)
            logger.info(f"[MT5] UserPasswordChange(type, login, pwd) result for {login_id}: {res}")
            if res and res != 0 and res is not False:
                return True
        except Exception as exc:
            logger.warning(f"[MT5] UserPasswordChange(type, login, pwd) exception: {exc}")

        # 2. Try UserPasswordChange(login, type, password)
        try:
            res = self.manager.UserPasswordChange(login_id, pwd_type_val, new_pwd)
            logger.info(f"[MT5] UserPasswordChange(login, type, pwd) result for {login_id}: {res}")
            if res and res != 0 and res is not False:
                return True
        except Exception as exc:
            logger.warning(f"[MT5] UserPasswordChange(login, type, pwd) exception: {exc}")

        # 3. Try UserPasswordSet(login, type, password) / UserPasswordSet(type, login, password)
        try:
            if hasattr(self.manager, "UserPasswordSet"):
                res = self.manager.UserPasswordSet(pwd_type_val, login_id, new_pwd)
                if not res:
                    res = self.manager.UserPasswordSet(login_id, pwd_type_val, new_pwd)
                logger.info(f"[MT5] UserPasswordSet result for {login_id}: {res}")
                if res and res != 0 and res is not False:
                    return True
        except Exception as exc:
            logger.warning(f"[MT5] UserPasswordSet exception for {login_id}: {exc}")

        # 4. Check if user exists on MT5 server
        try:
            user = self.manager.UserGet(login_id)
            if not user:
                logger.error(f"[MT5] UserGet({login_id}) returned None — account does not exist on MT5 server")
            else:
                logger.info(f"[MT5] UserGet({login_id}) found user: {getattr(user, 'Login', login_id)}")
        except Exception as exc:
            logger.warning(f"[MT5] UserGet exception for {login_id}: {exc}")

        logger.error(f"[MT5] Failed to change password for account {login_id}")
        return False

    @ensure_connected
    def _handle_funds_operation(self, login_id, amount, comment, deal_action, operation_type):
        try:
            deal_id = self.manager.DealerBalance(int(login_id), float(amount), deal_action, str(comment))
            return bool(deal_id)
        except Exception as e:
            logger.error(f"Exception in _handle_funds_operation: {e}")
            return False

    @ensure_connected
    def sync_mt5_groups(self):
        try:
            total = self.manager.GroupTotal()
            mt5_groups = []
            for i in range(total):
                group = self.manager.GroupNext(i)
                if group and hasattr(group, "Group"):
                    mt5_groups.append(group.Group)

            async def update_groups():
                for group_name in mt5_groups:
                    is_demo = "demo" in group_name.lower() or (not self.server_type)
                    await MT5GroupConfig.update_or_create(
                        group_name=group_name,
                        defaults={
                            "is_demo": is_demo,
                            "is_enabled": True,
                            "last_sync": timezone.now()
                        }
                    )
                if self.server_type:
                    await MT5GroupConfig.filter(is_demo=False, group_name__not_in=mt5_groups).update(is_enabled=False)
                else:
                    await MT5GroupConfig.filter(is_demo=True, group_name__not_in=mt5_groups).update(is_enabled=False)

            run_async(update_groups())
            return True
        except Exception as e:
            logger.error(f"Error syncing MT5 groups: {str(e)}")
            return False

    # ─────────────────────────────────────────────────────────────
    # Password generator
    # ─────────────────────────────────────────────────────────────

    def _generate_password(self, length=8):
        """Generate a secure password that meets MT5 requirements (e.g. Test_123 format)."""
        import random
        import string
        uppercase = random.choice(string.ascii_uppercase)
        lowercase_part = "".join(random.choices(string.ascii_lowercase, k=3))
        digits_part = "".join(random.choices(string.digits, k=3))
        return f"{uppercase}{lowercase_part}_{digits_part}"

    # ─────────────────────────────────────────────────────────────
    # Group helpers
    # ─────────────────────────────────────────────────────────────

    @ensure_connected
    def get_group_list(self, account_type: str = "real") -> list:
        """Return all MT5 group names, optionally filtering by 'real' or 'demo'."""
        groups = []
        try:
            total = self.manager.GroupTotal()
            for i in range(total):
                try:
                    grp = self.manager.GroupNext(i)
                    if grp and hasattr(grp, "Group"):
                        groups.append(grp.Group)
                except Exception as exc:
                    logger.error(f"Error getting group at index {i}: {exc}")
            if account_type.lower() == "demo":
                groups = [g for g in groups if "demo" in g.lower()]
            elif account_type.lower() == "real":
                groups = [g for g in groups if "demo" not in g.lower()]
        except Exception as exc:
            logger.error(f"Critical error in get_group_list: {exc}")
        return groups

    @ensure_connected
    def get_group_configuration(self, group_name: str):
        """Return leverage limits and currency for a specific MT5 group."""
        try:
            for i in range(self.manager.GroupTotal()):
                grp = self.manager.GroupNext(i)
                if grp and grp.Group == group_name:
                    return {
                        "name": grp.Group,
                        "leverage_max": getattr(grp, "LeverageMax", 1000),
                        "leverage_min": getattr(grp, "LeverageMin", 1),
                        "is_demo": "demo" in grp.Group.lower(),
                        "currency": getattr(grp, "Currency", "USD"),
                    }
        except Exception as exc:
            logger.error(f"Error getting group configuration for {group_name}: {exc}")
        return None

    # ─────────────────────────────────────────────────────────────
    # MAM Account creation
    # ─────────────────────────────────────────────────────────────

    @ensure_connected
    def create_mam_account(
        self,
        name: str = "",
        email: str = "",
        phone: str = "",
        country: str = "",
        group=None,
        leverage: int = 100,
        master_password=None,
        investor_password=None,
        master_strategy: str = "Quantitative Grid",
        broker: str = "Equinix Direct",
        initial_balance: float = 0.0,
        user_id: int = 0,
        agent: int = 0,
    ):


        """
        Create a new MT5 account for a MAM Manager and persist a MamAccount record.

        MT5 Agent is set to 0 (this account IS the master).
        Returns a dict with keys:
            login, group, master_password, investor_password, mam_account_id
        or None on failure.
        """
        try:
            # ── 1. Resolve group ──────────────────────────────────────────
            available_groups = self.get_group_list("real")
            if not available_groups:
                logger.error("[MAM] No real groups available on MT5 server.")
                return None

            if group and group in available_groups:
                selected_group = group
            else:
                async def _get_default_group():
                    return await TradeGroup.filter(is_default=True, is_active=True).first()
                default_tg = run_async(_get_default_group())
                if default_tg and default_tg.name in available_groups:
                    selected_group = default_tg.name
                else:
                    selected_group = available_groups[0]
                    logger.warning(f"[MAM] No configured default group; falling back to: {selected_group}")

            # ── 2. Build MT5 user object ─────────────────────────────────
            user = MT5Manager.MTUser(self.manager)
            user.Group    = str(selected_group)
            user.Leverage = int(leverage)
            user.Rights   = account_create_rights

            parts = name.strip().split(" ", 1) if name else [""]
            user.FirstName = parts[0]
            user.LastName  = parts[1] if len(parts) > 1 else ""
            if email:   user.EMail   = str(email)
            if phone:   user.Phone   = str(phone)
            if country: user.Country = str(country)
            # Get the agent from settings
            from django.conf import settings
            agent_value = getattr(settings, 'MT5_DEFAULT_AGENT', 426)
            user.Agent = int(agent_value) if agent_value else 0


            # ── 3. Passwords ─────────────────────────────────────────────
            master_pwd   = str(master_password)   if master_password   else self._generate_password()
            investor_pwd = str(investor_password) if investor_password else self._generate_password()

            logger.info(
                f"[MAM] Creating MAM master account: name='{name}', email='{email}', "
                f"group='{selected_group}', leverage={leverage}"
            )

            # ── 4. Add to MT5 ────────────────────────────────────────────
            if not self.manager.UserAdd(user, master_pwd, investor_pwd):
                last_err = MT5Manager.LastError()
                logger.error(f"[MAM] MT5 UserAdd failed: {last_err}")
                return None

            mt5_login = user.Login
            logger.info(f"[MAM] MT5 master account created: login={mt5_login}")

            # ── 5. Set leverage explicitly after creation ─────────────────
            try:
                self.change_leverage(mt5_login, leverage)
            except Exception as exc:
                logger.warning(f"[MAM] Could not set leverage for {mt5_login}: {exc}")

            # ── 5.5 Link agent explicitly ─────────────────────────────────
            if agent_value:
                try:
                    user_mt5 = self.manager.UserGet(mt5_login)
                    if user_mt5:
                        user_mt5.Agent = int(agent_value)
                        self.manager.UserUpdate(user_mt5)
                except Exception as exc:
                    logger.warning(f"[MAM] Could not explicitly set agent {agent_value} for MAM master {mt5_login}: {exc}")


            # ── 6. Deposit initial balance if requested ───────────────────
            if initial_balance > 0:
                try:
                    self.deposit_funds(mt5_login, initial_balance, "Initial MAM Balance")
                except Exception as exc:
                    logger.warning(f"[MAM] Could not deposit initial balance for {mt5_login}: {exc}")

            # ── 7. Persist TradingAccount record in DB (type=MAM) ────────────
            async def _save_mam(user_id):
                return await TradingAccount.create(
                    account_id=str(mt5_login),
                    account_type="MAM",
                    account_name=name or email,
                    user_id=user_id,
                    leverage=leverage,
                    balance=initial_balance,
                    equity=initial_balance,
                    margin=0,
                    margin_free=0,
                    margin_level=0,
                    is_enabled=True,
                    is_trading_enabled=True,
                    is_algo_enabled=False,
                    algo_enabled=False,
                    is_pending=False,
                    manager_allow_copy=True,
                    investor_allow_copy=False,
                    copy_trade_enabled=False,
                    dual_trade_enabled=False,
                    copy_multiplier_mode="Fixed",
                    fixed_copy_multiplier=1,
                    max_copy_multiplier=1,
                    multi_trade_count=1,
                    status="Active",
                )
            mam_record = run_async(_save_mam(user_id=user_id))

            logger.info(f"[MAM] TradingAccount (MAM) DB record created: id={mam_record.id}, account_id={mt5_login}")

            return {
                "login":             mt5_login,
                "group":             selected_group,
                "master_password":   master_pwd,
                "investor_password": investor_pwd,
                "trading_account_id": mam_record.id,
            }

        except Exception as exc:
            logger.error(f"[MAM] create_mam_account error: {exc}")
            return None

    # ─────────────────────────────────────────────────────────────
    # Investor Account creation
    # ─────────────────────────────────────────────────────────────

    @ensure_connected
    def create_investor_account(
        self,
        name: str = "",
        email: str = "",
        phone: str = "",
        country: str = "",
        group=None,
        leverage: int = 100,
        master_password=None,
        investor_password=None,
        mam_master_login=None,
        initial_balance: float = 0.0,
        allocated_mam=None,
        user_id: int = 0,
    ):

        """
        Create a new MT5 account for an Investor and link it to a MAM master account.

        The MT5 Agent field is set to `mam_master_login` so copy-trading starts
        immediately. Persists an Investor DB record.

        Returns a dict with keys:
            login, group, master_password, investor_password, investor_id
        or None on failure.
        """
        try:
            # ── 1. Resolve group ──────────────────────────────────────────
            available_groups = self.get_group_list("real")
            if not available_groups:
                logger.error("[INVESTOR] No real groups available on MT5 server.")
                return None

            if group and group in available_groups:
                selected_group = group
            else:
                async def _get_default_group():
                    return await TradeGroup.filter(is_default=True, is_active=True).first()
                default_tg = run_async(_get_default_group())
                if default_tg and default_tg.name in available_groups:
                    selected_group = default_tg.name
                else:
                    selected_group = available_groups[0]
                    logger.warning(f"[INVESTOR] No configured default group; falling back to: {selected_group}")

            # ── 2. Build MT5 user object ─────────────────────────────────
            user = MT5Manager.MTUser(self.manager)
            user.Group    = str(selected_group)
            user.Leverage = int(leverage)
            user.Rights   = account_create_rights

            parts = name.strip().split(" ", 1) if name else [""]
            user.FirstName = parts[0]
            user.LastName  = parts[1] if len(parts) > 1 else ""
            if email:   user.EMail   = str(email)
            if phone:   user.Phone   = str(phone)
            if country: user.Country = str(country)

            # Link investor to MAM master via Agent field
            user.Agent = int(mam_master_login) if mam_master_login else 0

            # ── 3. Passwords ─────────────────────────────────────────────
            master_pwd   = str(master_password)   if master_password   else self._generate_password()
            investor_pwd = str(investor_password) if investor_password else self._generate_password()

            logger.info(
                f"[INVESTOR] Creating investor account: name='{name}', email='{email}', "
                f"group='{selected_group}', leverage={leverage}, mam_master={mam_master_login}"
            )

            # ── 4. Add to MT5 ────────────────────────────────────────────
            if not self.manager.UserAdd(user, master_pwd, investor_pwd):
                last_err = MT5Manager.LastError()
                logger.error(f"[INVESTOR] MT5 UserAdd failed: {last_err}")
                return None

            mt5_login = user.Login
            logger.info(f"[INVESTOR] MT5 investor account created: login={mt5_login}")

            # ── 5. Set leverage ───────────────────────────────────────────
            try:
                self.change_leverage(mt5_login, leverage)
            except Exception as exc:
                logger.warning(f"[INVESTOR] Could not set leverage for {mt5_login}: {exc}")

            # ── 5.5 Link investor to MAM master explicitly ───────────────
            if mam_master_login:
                try:
                    self.link_investor_to_mam(mt5_login, mam_master_login)
                except Exception as exc:
                    logger.warning(f"[INVESTOR] Could not link investor {mt5_login} to MAM master {mam_master_login}: {exc}")


            # ── 6. Deposit initial balance ────────────────────────────────
            if initial_balance > 0:
                try:
                    self.deposit_funds(mt5_login, initial_balance, "Initial Investor Balance")
                except Exception as exc:
                    logger.warning(f"[INVESTOR] Could not deposit initial balance for {mt5_login}: {exc}")

            # ── 7. Persist TradingAccount record in DB (type=Investor) ──────
            async def _save_investor(user_id, mam_ta_id):
                return await TradingAccount.create(
                    account_id=str(mt5_login),
                    account_type="Investor",
                    account_name=name or email,
                    user_id=user_id,
                    mam_master_account_id=mam_ta_id,
                    leverage=leverage,
                    balance=initial_balance,
                    equity=initial_balance,
                    margin=0,
                    margin_free=0,
                    margin_level=0,
                    is_enabled=True,
                    is_trading_enabled=True,
                    is_algo_enabled=False,
                    algo_enabled=False,
                    is_pending=False,
                    manager_allow_copy=False,
                    investor_allow_copy=True,
                    copy_trade_enabled=True,
                    dual_trade_enabled=False,
                    copy_mode="Proportional",
                    copy_multiplier_mode="Fixed",
                    fixed_copy_multiplier=1,
                    max_copy_multiplier=1,
                    multi_trade_count=1,
                    status="Active",
                )
            investor_record = run_async(_save_investor(user_id=user_id, mam_ta_id=None))

            logger.info(f"[INVESTOR] TradingAccount (Investor) DB record created: id={investor_record.id}, account_id={mt5_login}")

            return {
                "login":             mt5_login,
                "group":             selected_group,
                "master_password":   master_pwd,
                "investor_password": investor_pwd,
                "trading_account_id": investor_record.id,
            }

        except Exception as exc:
            logger.error(f"[INVESTOR] create_investor_account error: {exc}")
            return None

    # ─────────────────────────────────────────────────────────────
    # MAM copy-trading link management
    # ─────────────────────────────────────────────────────────────

    @ensure_connected
    def link_investor_to_mam(self, investor_login: int, mam_master_login: int) -> bool:
        """Set investor Agent = MAM master login to start copy-trading."""
        try:
            user = self.manager.UserGet(int(investor_login))
            if user:
                user.Agent = int(mam_master_login)
                if self.manager.UserUpdate(user):
                    logger.info(f"[MAM] Linked investor {investor_login} → master {mam_master_login}")
                    return True
        except Exception as exc:
            logger.error(f"[MAM] link_investor_to_mam error: {exc}")
        return False

    @ensure_connected
    def unlink_investor_from_mam(self, investor_login: int) -> bool:
        """Set investor Agent = 0 to stop copy-trading."""
        try:
            user = self.manager.UserGet(int(investor_login))
            if user:
                user.Agent = 0
                if self.manager.UserUpdate(user):
                    logger.info(f"[MAM] Unlinked investor {investor_login} from MAM master")
                    return True
        except Exception as exc:
            logger.error(f"[MAM] unlink_investor_from_mam error: {exc}")
        return False

    # Aliases for compatibility
    def pause_mam_copy(self, login_id: int) -> bool:
        return self.unlink_investor_from_mam(login_id)

    def start_mam_copy(self, login_id: int, agent: int) -> bool:
        return self.link_investor_to_mam(login_id, agent)

    # ─────────────────────────────────────────────────────────────
    # Account enable / disable / toggle / move group
    # ─────────────────────────────────────────────────────────────

    @ensure_connected
    def enable_account(self, login_id: int) -> bool:
        """Enable a trading account (set standard creation rights)."""
        try:
            user = self.manager.UserGet(int(login_id))
            if not user:
                return False
            user.Rights = account_create_rights
            return bool(self.manager.UserUpdate(user))
        except Exception as exc:
            logger.error(f"[MT5] enable_account error for {login_id}: {exc}")
            return False

    @ensure_connected
    def disable_account(self, login_id: int) -> bool:
        """Disable a trading account (remove USER_RIGHT_ENABLED)."""
        try:
            user = self.manager.UserGet(int(login_id))
            if not user:
                return False
            user.Rights = disable_account_rights
            return bool(self.manager.UserUpdate(user))
        except Exception as exc:
            logger.error(f"[MT5] disable_account error for {login_id}: {exc}")
            return False

    @ensure_connected
    def toggle_account_status(self, login_id: int, action: str) -> bool:
        """Toggle account status: action='enable' or 'disable'."""
        if action == "enable":
            return self.enable_account(login_id)
        if action == "disable":
            return self.disable_account(login_id)
        return False

    @ensure_connected
    def change_account_group(self, login_id: int, group: str) -> bool:
        """Move an account to a different MT5 group."""
        try:
            user = self.manager.UserGet(int(login_id))
            if user:
                user.Group = str(group)
                return bool(self.manager.UserUpdate(user))
        except Exception as exc:
            logger.error(f"[MT5] change_account_group error for {login_id}: {exc}")
        return False

    # ─────────────────────────────────────────────────────────────
    # Account data / balance / equity helpers
    # ─────────────────────────────────────────────────────────────

    @ensure_connected
    def get_account_data(self, login_id, use_cache: bool = True) -> dict:
        """
        Return {'balance': float, 'equity': float}.
        Cached for 30 s to reduce MT5 API pressure.
        """
        try:
            if use_cache:
                cached = get_cached_account_success(login_id)
                if cached:
                    return {"balance": cached["balance"], "equity": cached["equity"]}

            if get_cached_account_data(login_id, "balance"):
                return {"balance": 0.0, "equity": 0.0}

            account = self.manager.UserAccountGet(int(login_id))
            if account:
                balance = float(account.Balance)
                equity  = float(account.Equity)
                if use_cache:
                    cache_account_success(login_id, balance, equity)
                return {"balance": balance, "equity": equity}

            cache_failed_account_lookup(login_id, "balance", 300)
            cache_failed_account_lookup(login_id, "equity",  300)
            _remove_trading_account_from_db(login_id, reason="account data lookup")

            if should_log_error(login_id, "account_not_found"):
                logger.warning(f"MT5 account not found for login_id: {login_id}")
            return {"balance": 0.0, "equity": 0.0}

        except Exception as exc:
            if should_log_error(login_id, "account_error"):
                logger.error(f"get_account_data error for {login_id}: {exc}")
            return {"balance": 0.0, "equity": 0.0}

    @ensure_connected
    def get_balance(self, login_id) -> float:
        return self.get_account_data(login_id).get("balance", 0.0)

    @ensure_connected
    def get_equity(self, login_id) -> float:
        return self.get_account_data(login_id).get("equity", 0.0)

    @ensure_connected
    def get_account_info(self, login_id):
        """Return basic account info dict or None."""
        try:
            user    = self.manager.UserGet(int(login_id))
            account = self.manager.UserAccountGet(int(login_id))
            if not user or not account:
                return None
            return {
                "login":    user.Login,
                "name":     f"{user.FirstName} {user.LastName}".strip(),
                "email":    user.EMail,
                "balance":  account.Balance,
                "equity":   account.Equity,
                "group":    user.Group,
                "leverage": user.Leverage,
                "rights":   user.Rights,
                "agent":    user.Agent,
            }
        except Exception as exc:
            logger.error(f"get_account_info error for {login_id}: {exc}")
            return None

    @ensure_connected
    def get_account_details(self, login_id):
        """Return detailed account info including margin data."""
        try:
            user    = self.manager.UserGet(int(login_id))
            account = self.manager.UserAccountGet(int(login_id))
            if not user or not account:
                return None
            return {
                "login":        user.Login,
                "name":         f"{user.FirstName} {user.LastName}".strip(),
                "email":        user.EMail,
                "balance":      account.Balance,
                "equity":       account.Equity,
                "margin":       account.Margin,
                "margin_free":  account.MarginFree,
                "margin_level": account.MarginLevel,
                "profit":       account.Profit,
                "group":        user.Group,
                "leverage":     user.Leverage,
                "rights":       user.Rights,
                "agent":        user.Agent,
            }
        except Exception as exc:
            logger.error(f"get_account_details error for {login_id}: {exc}")
            return None

    # ─────────────────────────────────────────────────────────────
    # Delete account
    # ─────────────────────────────────────────────────────────────

    @ensure_connected
    def delete_account(self, login_id: int) -> bool:
        """Disable then permanently delete an MT5 account."""
        try:
            self.disable_account(login_id)
            result = self.manager.UserDelete(int(login_id))
            if result:
                logger.info(f"[MT5] Deleted account {login_id}")
                return True
            logger.error(f"[MT5] Failed to delete account {login_id}: {MT5Manager.LastError()}")
            return False
        except Exception as exc:
            logger.error(f"[MT5] delete_account error for {login_id}: {exc}")
            return False

    # ─────────────────────────────────────────────────────────────
    # Profit / closed-trade helpers
    # ─────────────────────────────────────────────────────────────

    @ensure_connected
    def total_account_profit(self, login_id) -> float:
        """Return floating P&L = Equity - Balance."""
        try:
            if get_cached_account_data(login_id, "profit"):
                return 0.0
            account = self.manager.UserAccountGet(int(login_id))
            if account:
                return float(account.Equity - account.Balance)
            cache_failed_account_lookup(login_id, "profit", 300)
            return 0.0
        except Exception as exc:
            logger.error(f"total_account_profit error for {login_id}: {exc}")
            return 0.0
