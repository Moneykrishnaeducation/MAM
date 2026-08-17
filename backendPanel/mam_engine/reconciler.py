"""Stateful Differential Reconciler for Crash Recovery and Idle State Verification."""

from __future__ import annotations

import logging
import os
import time
from collections.abc import Callable
from typing import Any

from backendPanel.mam_engine.events import ActionType, CopyCommand
from backendPanel.mam_engine.idempotency import IdempotencyEngine
from backendPanel.mam_engine.routing_cache import RoutingCache

logger = logging.getLogger(__name__)
AGENT_CODE_PREFIX = os.getenv("AGENT_CODE_PREFIX", "426")


class StatefulReconciler:
    """Safe state reconciler comparing Master MT5 State vs Persistent Copy State vs Follower MT5 State."""

    def __init__(
        self,
        manager_api: Any,
        cache: RoutingCache,
        idempotency: IdempotencyEngine,
        dispatch_func: Callable[[CopyCommand], bool],
    ):
        self.manager_api = manager_api
        self.cache = cache
        self.idempotency = idempotency
        self.dispatch_func = dispatch_func
        self._last_resync_ts = 0.0

    def run_differential_resync(self, cooldown_seconds: float = 15.0):
        """Perform non-blocking state reconciliation between masters and followers."""
        now = time.time()
        if now - self._last_resync_ts < cooldown_seconds:
            return
        self._last_resync_ts = now

        try:
            group_total = self.manager_api.GroupTotal()
            for i in range(group_total):
                group = self.manager_api.GroupNext(i).Group
                if "demo" in group.lower():
                    continue

                for leader in self.manager_api.UserGetByGroup(group):
                    if not str(getattr(leader, "Agent", "")).startswith(AGENT_CODE_PREFIX):
                        continue

                    master_id = leader.Login
                    followers = self.cache.get_followers(self.manager_api, master_id)
                    if not followers:
                        continue

                    # 1. Reconcile Master Positions
                    self._reconcile_master_positions(master_id, followers)

                    # 2. Reconcile Master Pending Orders
                    self._reconcile_master_orders(master_id, followers)

        except Exception as e:
            logger.error(f"[RECONCILER] Error during differential resync: {e}")

    def _reconcile_master_positions(self, master_id: int, followers: list[int]):
        try:
            positions = self.manager_api.PositionGet(master_id) or []
            for pos in positions:
                master_ticket = getattr(
                    pos, "Position", getattr(pos, "PositionID", getattr(pos, "Order", 0))
                )
                if not master_ticket:
                    continue

                if self.idempotency.is_master_position_processed(master_ticket):
                    continue

                # Check if followers already hold matching position comments
                expected_prefix = f"{master_id}_{master_ticket}"
                leader_user = self.cache.get_user(self.manager_api, master_id)
                leader_balance = getattr(leader_user, "Balance", 1.0) or 1.0
                symbol_info = self.cache.get_symbol(self.manager_api, pos.Symbol)
                symbol_min_vol = getattr(symbol_info, "VolumeMin", 0.01) or 0.01

                for fid in followers:
                    try:
                        follower_positions = self.manager_api.PositionGet(fid) or []
                        already_exists = any(
                            p.Comment
                            and (
                                p.Comment == expected_prefix
                                or p.Comment.startswith(f"{expected_prefix}_trade")
                            )
                            for p in follower_positions
                        )

                        if not already_exists:
                            cfg = self.cache.get_follower_config(fid)
                            multi_count = cfg.multi_trade_count if cfg else 1
                            copy_mode = cfg.copy_mode if cfg else "proportional"
                            copy_factor = cfg.copy_factor if cfg else 1.0

                            follower_user = self.cache.get_user(self.manager_api, fid)
                            follower_balance = getattr(follower_user, "Balance", 1.0) or 1.0

                            if copy_mode == "fixed_multiple":
                                calc_vol = float(pos.Volume) * copy_factor
                            else:
                                calc_vol = float(pos.Volume) * (follower_balance / leader_balance)

                            final_vol = max(
                                symbol_min_vol,
                                int(calc_vol / symbol_min_vol) * symbol_min_vol
                                if symbol_min_vol > 0
                                else calc_vol,
                            )

                            for trade_idx in range(1, multi_count + 1):
                                comment = (
                                    f"{expected_prefix}_trade{trade_idx}"
                                    if multi_count > 1
                                    else expected_prefix
                                )
                                dedupe_key = f"OPEN_{master_id}_{master_ticket}_{fid}"
                                if multi_count > 1:
                                    dedupe_key += f"_trade{trade_idx}"

                                if self.idempotency.is_recently_processed(dedupe_key):
                                    continue

                                logger.info(
                                    f"[RECONCILER-MISSING] Master {master_id} position {master_ticket} missing on follower {fid}. Dispatching copy..."
                                )
                                cmd = CopyCommand(
                                    command_id=f"resync_pos_{master_ticket}_{fid}_{trade_idx}",
                                    master_id=master_id,
                                    master_ticket=master_ticket,
                                    follower_id=fid,
                                    action=ActionType.OPEN,
                                    symbol=pos.Symbol,
                                    volume=final_vol,
                                    order_type=pos.Action,
                                    price_order=pos.PriceCurrent,
                                    price_sl=getattr(pos, "PriceSL", 0.0) or 0.0,
                                    price_tp=getattr(pos, "PriceTP", 0.0) or 0.0,
                                    comment=comment,
                                    trade_index=trade_idx,
                                    total_copies=multi_count,
                                )
                                self.dispatch_func(cmd)
                    except Exception as fe:
                        logger.debug(f"[RECONCILER] Error checking follower {fid}: {fe}")

        except Exception as e:
            logger.debug(f"[RECONCILER] Position resync check error for master {master_id}: {e}")

    def _reconcile_master_orders(self, master_id: int, followers: list[int]):
        try:
            orders = self.manager_api.OrderGetOpen(master_id) or []
            for ord_obj in orders:
                if getattr(ord_obj, "State", 0) != 1 or getattr(ord_obj, "Type", 0) < 2:
                    continue  # Only check open pending orders

                master_ticket = getattr(ord_obj, "Order", 0)
                if not master_ticket:
                    continue

                expected_prefix = f"{master_id}_{master_ticket}"
                for fid in followers:
                    try:
                        follower_orders = self.manager_api.OrderGetOpen(fid) or []
                        already_exists = any(
                            o.Comment
                            and (
                                o.Comment == expected_prefix
                                or o.Comment.startswith(f"{expected_prefix}_trade")
                            )
                            for o in follower_orders
                        )

                        if not already_exists:
                            follower_positions = self.manager_api.PositionGet(fid) or []
                            already_triggered = any(
                                p.Comment
                                and (
                                    p.Comment == expected_prefix
                                    or p.Comment.startswith(f"{expected_prefix}_trade")
                                )
                                for p in follower_positions
                            )
                            if already_triggered:
                                logger.debug(
                                    f"[RECONCILER-SKIP] Master {master_id} pending order {master_ticket} already triggered on follower {fid}."
                                )
                                continue

                            logger.info(
                                f"[RECONCILER-MISSING] Master {master_id} pending order {master_ticket} missing on follower {fid}. Dispatching..."
                            )
                            cfg = self.cache.get_follower_config(fid)
                            multi_count = cfg.multi_trade_count if cfg else 1

                            for trade_idx in range(1, multi_count + 1):
                                comment = (
                                    f"{expected_prefix}_trade{trade_idx}"
                                    if multi_count > 1
                                    else expected_prefix
                                )
                                dedupe_key = f"PENDING_OPEN_{master_id}_{master_ticket}_{fid}"
                                if multi_count > 1:
                                    dedupe_key += f"_trade{trade_idx}"

                                if self.idempotency.is_recently_processed(dedupe_key):
                                    continue

                                logger.info(
                                    f"[RECONCILER-MISSING] Master {master_id} pending order {master_ticket} missing on follower {fid}. Dispatching..."
                                )
                                cmd = CopyCommand(
                                    command_id=f"resync_ord_{master_ticket}_{fid}_{trade_idx}",
                                    master_id=master_id,
                                    master_ticket=master_ticket,
                                    follower_id=fid,
                                    action=ActionType.PENDING_OPEN,
                                    symbol=ord_obj.Symbol,
                                    volume=ord_obj.VolumeCurrent,
                                    order_type=ord_obj.Type,
                                    price_order=getattr(ord_obj, "PriceOrder", 0.0) or 0.0,
                                    price_trigger=getattr(ord_obj, "PriceTrigger", 0.0) or 0.0,
                                    price_sl=getattr(ord_obj, "PriceSL", 0.0) or 0.0,
                                    price_tp=getattr(ord_obj, "PriceTP", 0.0) or 0.0,
                                    comment=comment,
                                    trade_index=trade_idx,
                                    total_copies=multi_count,
                                )
                                self.dispatch_func(cmd)
                    except Exception as fe:
                        logger.debug(
                            f"[RECONCILER] Order resync error for follower {fid}: {fe}"
                        )
        except Exception as e:
            logger.debug(f"[RECONCILER] Order resync check error for master {master_id}: {e}")

