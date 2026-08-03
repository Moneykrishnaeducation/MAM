import MT5Manager
import requests
import time
import threading
import logging
import asyncio
import concurrent.futures
from django.core.cache import cache
from django.utils import timezone
from datetime import datetime, timedelta
import os
import json
from asgiref.sync import async_to_sync

from adminPanel.models import ServerSetting, MT5GroupConfig, TradeGroup, MamAccount, Investor

logger = logging.getLogger(__name__)

FAILED_ACCOUNT_CACHE = {}
CACHE_EXPIRY_MINUTES = 5
MAX_ERROR_LOG_RATE = 10

GROUP_CONFIG = {}
try:
    config_path = os.path.join(os.path.dirname(__file__), "group_config.json")
    if os.path.exists(config_path):
        with open(config_path, "r") as f:
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

def reset_manager_instance():
    global _real_manager_instance, _demo_manager_instance, _current_real_setting, _current_demo_setting
    with _manager_lock:
        if _real_manager_instance:
            try:
                _real_manager_instance.connected = False
                logger.info("Real MT5 Manager instance reset successfully")
            except Exception as e:
                logger.warning(f"Error while resetting real manager instance: {e}")
        if _demo_manager_instance:
            try:
                _demo_manager_instance.connected = False
                logger.info("Demo MT5 Manager instance reset successfully")
            except Exception as e:
                logger.warning(f"Error while resetting demo manager instance: {e}")
       
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

def force_refresh_trading_groups():
    try:
        async def clear_groups():
            await MT5GroupConfig.all().update(is_enabled=False, last_sync=None)
        run_async(clear_groups())
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
            updated = False
            # Check MamAccount
            ma = await MamAccount.filter(account_number=str(login_id)).first()
            if ma:
                await MamAccount.filter(account_number=str(login_id)).update(status="Disabled")
                updated = True
            # Check Investor
            inv = await Investor.filter(account_number=str(login_id)).first()
            if inv:
                await Investor.filter(account_number=str(login_id)).update(status="Disabled")
                updated = True
            return updated
        updated = run_async(mark_inactive())
        if updated:
            logger.info(f"Marked Mam/Investor Account inactive for missing MT5 account {login_id}. Reason: {reason}")
            return True
        return False
    except Exception as e:
        logger.error(f"Failed to remove Mam/Investor Account for login_id {login_id}: {e}")
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
        MT5Manager.InitializeManagerAPIPath(module_path=instance_directory, work_path=instance_directory)
       
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
        return _get_manager_instance_sync(server_type)
    except Exception as e:
        logger.error(f"Unexpected error in get_manager_instance: {e}")
        raise

def _get_manager_instance_sync(server_type: bool = True):
    global _real_manager_instance, _demo_manager_instance, _current_real_setting, _current_demo_setting
    with _manager_lock:  
        try:
            async def get_setting():
                return await ServerSetting.filter(server_type=server_type).order_by("-created_at").first()

            latest_setting = run_async(get_setting())
            if not latest_setting:
                raise Exception(f"No server settings found for server_type={server_type}")

            if server_type:
                instance = _real_manager_instance
                current_setting = _current_real_setting
            else:
                instance = _demo_manager_instance
                current_setting = _current_demo_setting

            if instance is None or current_setting != latest_setting:
                instance = MT5ManagerAPI()
                try:
                    instance.connect(
                        address=latest_setting.get_decrypted_server_ip(),
                        login=int(latest_setting.real_account_login),
                        password=latest_setting.get_decrypted_real_account_password(),
                        mode=MT5Manager.ManagerAPI.EnPumpModes.PUMP_MODE_FULL,
                        timeout=120000,
                    )
                    logger.info(f"Connected to {'real' if server_type else 'demo'} MT5 server (login={latest_setting.real_account_login})")
                    if server_type:
                        _real_manager_instance = instance
                        _current_real_setting = latest_setting
                    else:
                        _demo_manager_instance = instance
                        _current_demo_setting = latest_setting
                except Exception as e:
                    error_message = f"Failed to connect to MT5 Manager: {str(e)}"
                    logger.error(error_message)
                    raise Exception(error_message)
            return instance if server_type else _demo_manager_instance

        except Exception as e:
            logger.error(f"Error in get_manager_instance: {str(e)}")
            raise

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
