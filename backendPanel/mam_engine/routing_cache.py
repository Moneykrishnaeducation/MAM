"""Low-Latency Thread-Safe Routing & Configuration Cache."""

from __future__ import annotations

import logging
import os
import threading
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Set, Tuple

logger = logging.getLogger(__name__)

AGENT_CODE_PREFIX = os.getenv("AGENT_CODE_PREFIX", "426")


@dataclass
class FollowerConfig:
    account_id: str
    copy_mode: str  # "proportional" | "fixed_multiple" | etc.
    copy_factor: float
    account_type: str
    dual_trade_enabled: bool
    multi_trade_count: int
    investor_allow_copy: bool


class RoutingCache:
    """Thread-safe, in-memory cache for zero-DB-latency hot-path execution."""

    def __init__(
        self,
        follower_ttl: float = 5.0,
        config_ttl: float = 10.0,
        user_ttl: float = 5.0,
        symbol_ttl: float = 60.0,
    ):
        self._follower_ttl = follower_ttl
        self._config_ttl = config_ttl
        self._user_ttl = user_ttl
        self._symbol_ttl = symbol_ttl

        self._lock = threading.RLock()
        self._followers: Dict[int, Tuple[List[int], float]] = {}
        self._configs: Dict[str, Tuple[FollowerConfig, float]] = {}
        self._users: Dict[int, Tuple[Any, float]] = {}
        self._symbols: Dict[str, Tuple[Any, float]] = {}

    def get_followers(self, manager_api: Any, master_id: int) -> List[int]:
        """Fetch active followers for a master account using memory cache first."""
        now = time.time()
        with self._lock:
            if master_id in self._followers:
                cached_list, ts = self._followers[master_id]
                if now - ts < self._follower_ttl:
                    return cached_list

        leader = self.get_user(manager_api, master_id)
        if not leader or not str(getattr(leader, "Agent", "")).startswith(AGENT_CODE_PREFIX):
            with self._lock:
                self._followers[master_id] = ([], now)
            return []

        potential_followers = []
        try:
            for u in manager_api.UserGetByGroup(leader.Group):
                if getattr(u, "Agent", None) == master_id:
                    potential_followers.append(u.Login)
        except Exception as e:
            logger.warning(f"[CACHE] Failed UserGetByGroup for group {leader.Group}: {e}")

        # Filter active followers using cached config
        active_followers = []
        for fid in potential_followers:
            cfg = self.get_follower_config(fid)
            if cfg is None or cfg.investor_allow_copy:
                active_followers.append(fid)

        with self._lock:
            self._followers[master_id] = (active_followers, now)
        return active_followers

    def get_follower_config(self, follower_id: int | str) -> Optional[FollowerConfig]:
        """Fetch follower trading account settings from memory cache (or load from DB)."""
        fid_str = str(follower_id)
        now = time.time()
        with self._lock:
            if fid_str in self._configs:
                cfg, ts = self._configs[fid_str]
                if now - ts < self._config_ttl:
                    return cfg

        # Cold load from database
        cfg = self._load_config_from_db(fid_str)
        if cfg:
            with self._lock:
                self._configs[fid_str] = (cfg, now)
        return cfg

    def _load_config_from_db(self, follower_id_str: str) -> Optional[FollowerConfig]:
        """Load single follower configuration from PostgreSQL."""
        try:
            from django.db import connection, close_old_connections

            close_old_connections()
            with connection.cursor() as cursor:
                cursor.execute(
                    'SELECT account_id, copy_mode, copy_factor, account_type, dual_trade_enabled, multi_trade_count, investor_allow_copy FROM "trading_accounts" WHERE account_id = %s',
                    [follower_id_str],
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
                        allow_copy,
                    ) = row
                    return FollowerConfig(
                        account_id=str(acct_id),
                        copy_mode=str(acct_mode or "proportional"),
                        copy_factor=float(acct_factor or 1.0),
                        account_type=str(acct_type or "Investor"),
                        dual_trade_enabled=bool(dual_trade),
                        multi_trade_count=max(1, min(10, int(multi_trade_count or 1))),
                        investor_allow_copy=bool(allow_copy if allow_copy is not None else True),
                    )
        except Exception as e:
            logger.warning(f"[CACHE] Could not load config for follower {follower_id_str}: {e}")

        return None

    def invalidate_follower(self, master_id: int):
        with self._lock:
            self._followers.pop(master_id, None)

    def invalidate_config(self, follower_id: int | str):
        with self._lock:
            self._configs.pop(str(follower_id), None)

    def get_user(self, manager_api: Any, login: int) -> Any:
        now = time.time()
        with self._lock:
            if login in self._users:
                user, ts = self._users[login]
                if now - ts < self._user_ttl:
                    return user

        try:
            user = manager_api.UserGet(login)
            if user:
                with self._lock:
                    self._users[login] = (user, now)
            return user
        except Exception:
            return None

    def get_symbol(self, manager_api: Any, symbol: str) -> Any:
        now = time.time()
        with self._lock:
            if symbol in self._symbols:
                sym_info, ts = self._symbols[symbol]
                if now - ts < self._symbol_ttl:
                    return sym_info

        try:
            sym_info = manager_api.SymbolGet(symbol)
            if sym_info:
                with self._lock:
                    self._symbols[symbol] = (sym_info, now)
            return sym_info
        except Exception:
            return None

    def clear(self):
        with self._lock:
            self._followers.clear()
            self._configs.clear()
            self._users.clear()
            self._symbols.clear()
