"""Main Orchestration Engine and Parallel Event Router for Pure Non-Queued Execution."""

from __future__ import annotations

import logging
import os
import sys
import threading
import time
from typing import Any, List, Optional

from backendPanel.mam_engine.dealer import MT5DealerExecutor
from backendPanel.mam_engine.events import ActionType, CopyCommand, TradeExecutionResult
from backendPanel.mam_engine.idempotency import IdempotencyEngine
from backendPanel.mam_engine.persistence import AsyncPersistenceManager
from backendPanel.mam_engine.reconciler import StatefulReconciler
from backendPanel.mam_engine.routing_cache import AGENT_CODE_PREFIX, RoutingCache

logger = logging.getLogger(__name__)


class MAMCopyEngine:
    """High-performance, pure parallel MAM Copy Trading Engine without queues."""

    def __init__(self, manager_api: Any):
        self.manager_api = manager_api
        self.cache = RoutingCache()
        self.idempotency = IdempotencyEngine()
        self.persistence = AsyncPersistenceManager(num_workers=4)

        # Dealer sink wrapper
        self.dealer_sink = self._create_dealer_sink()
        self.dealer_executor = MT5DealerExecutor(
            manager_api=self.manager_api,
            dealer_sink=self.dealer_sink,
            cache=self.cache,
            idempotency=self.idempotency,
            persistence=self.persistence,
        )

        # Stateful reconciler
        self.reconciler = StatefulReconciler(
            manager_api=self.manager_api,
            cache=self.cache,
            idempotency=self.idempotency,
            dispatch_func=self.dispatch_parallel,
        )

        self._active = False
        self._last_activity_ts = time.time()

    def start(self):
        """Start async persistence and engine services."""
        self._active = True
        self.idempotency.preload_from_db()
        self.persistence.start()
        logger.info("[MAM_ENGINE] Pure parallel engine ready (Queue-free).")

    def stop(self):
        """Clean shutdown of engine services."""
        self._active = False
        self.persistence.stop()
        logger.info("[MAM_ENGINE] Engine stopped cleanly.")

    def dispatch_parallel(self, cmd: CopyCommand) -> bool:
        """Immediately execute trade in a dedicated parallel thread without queueing."""
        t = threading.Thread(
            target=self.dealer_executor.execute_command,
            args=(cmd,),
            daemon=True,
        )
        t.start()
        return True

    def route_master_position_open(self, order_obj: Any):
        """Normalize and execute master position open event across followers in parallel."""
        self._last_activity_ts = time.time()
        master_id = getattr(order_obj, "Login", 0)
        if not master_id:
            return

        master_ticket = (
            getattr(order_obj, "PositionID", None)
            or getattr(order_obj, "Position", None)
            or getattr(order_obj, "Order", 0)
        )
        if not master_ticket:
            return

        followers = self.cache.get_followers(self.manager_api, master_id)
        if not followers:
            return

        leader_user = self.cache.get_user(self.manager_api, master_id)
        leader_balance = getattr(leader_user, "Balance", 1.0) or 1.0
        symbol_info = self.cache.get_symbol(self.manager_api, order_obj.Symbol)
        symbol_min_vol = getattr(symbol_info, "VolumeMin", 0.01) or 0.01

        base_vol = (
            getattr(order_obj, "VolumeInitial", getattr(order_obj, "Volume", 0.0)) or 0.0
        )

        for fid in followers:
            cfg = self.cache.get_follower_config(fid)
            multi_count = cfg.multi_trade_count if cfg else 1
            copy_mode = cfg.copy_mode if cfg else "proportional"
            copy_factor = cfg.copy_factor if cfg else 1.0

            follower_user = self.cache.get_user(self.manager_api, fid)
            follower_balance = getattr(follower_user, "Balance", 1.0) or 1.0

            if copy_mode == "fixed_multiple":
                calc_vol = float(base_vol) * copy_factor
            else:
                calc_vol = float(base_vol) * (follower_balance / leader_balance)

            final_vol = max(
                symbol_min_vol,
                int(calc_vol / symbol_min_vol) * symbol_min_vol
                if symbol_min_vol > 0
                else calc_vol,
            )

            follower_positions = self.manager_api.PositionGet(fid) or []
            existing_comments = {str(getattr(p, "Comment", "")) for p in follower_positions}

            for trade_idx in range(1, multi_count + 1):
                comment = (
                    f"{master_id}_{master_ticket}_trade{trade_idx}"
                    if multi_count > 1
                    else f"{master_id}_{master_ticket}"
                )
                if comment in existing_comments or any(c.startswith(comment) for c in existing_comments):
                    logger.info(
                        f"[ENGINE_SKIP] Follower {fid} already has open position for {comment}. Skipping duplicate OPEN."
                    )
                    continue

                cmd = CopyCommand(
                    command_id=f"pos_open_{master_ticket}_{fid}_{trade_idx}",
                    master_id=master_id,
                    master_ticket=master_ticket,
                    follower_id=fid,
                    action=ActionType.OPEN,
                    symbol=order_obj.Symbol,
                    volume=final_vol,
                    order_type=getattr(order_obj, "Type", getattr(order_obj, "Action", 0)),
                    price_order=getattr(
                        order_obj, "PriceOrder", getattr(order_obj, "PriceCurrent", 0.0)
                    ),
                    price_sl=getattr(order_obj, "PriceSL", 0.0) or 0.0,
                    price_tp=getattr(order_obj, "PriceTP", 0.0) or 0.0,
                    comment=comment,
                    trade_index=trade_idx,
                    total_copies=multi_count,
                    created_ts=time.time(),
                )
                # Dispatch in a parallel thread for immediate 0.0ms queue-wait execution
                self.dispatch_parallel(cmd)

    def route_master_position_close(self, pos_obj: Any):
        """Normalize and execute master position close event across followers in parallel."""
        self._last_activity_ts = time.time()
        master_id = getattr(pos_obj, "Login", 0)
        master_ticket = getattr(pos_obj, "Position", getattr(pos_obj, "PositionID", 0))
        if not master_id or not master_ticket:
            return

        self.idempotency.mark_master_position_processed(master_ticket)
        followers = self.cache.get_followers(self.manager_api, master_id)

        for fid in followers:
            cfg = self.cache.get_follower_config(fid)
            multi_count = cfg.multi_trade_count if cfg else 1

            follower_positions = self.manager_api.PositionGet(fid) or []
            expected_prefix = f"{master_id}_{master_ticket}"

            for p in follower_positions:
                pos_comment = str(getattr(p, "Comment", ""))
                if pos_comment == expected_prefix or pos_comment.startswith(
                    f"{expected_prefix}_trade"
                ):
                    cmd = CopyCommand(
                        command_id=f"pos_close_{master_ticket}_{fid}_{p.Position}",
                        master_id=master_id,
                        master_ticket=p.Position,
                        follower_id=fid,
                        action=ActionType.CLOSE,
                        symbol=pos_obj.Symbol,
                        volume=p.Volume,
                        order_type=int(not p.Action),
                        price_order=p.PriceCurrent,
                        comment=pos_comment,
                        created_ts=time.time(),
                    )
                    self.dispatch_parallel(cmd)

    def route_master_position_modify(self, pos_obj: Any):
        """Normalize and execute SL/TP position modifications in parallel."""
        self._last_activity_ts = time.time()
        master_id = getattr(pos_obj, "Login", 0)
        master_ticket = getattr(pos_obj, "Position", getattr(pos_obj, "PositionID", 0))
        if not master_id or not master_ticket:
            return

        followers = self.cache.get_followers(self.manager_api, master_id)
        expected_prefix = f"{master_id}_{master_ticket}"

        for fid in followers:
            follower_positions = self.manager_api.PositionGet(fid) or []
            for p in follower_positions:
                pos_comment = str(getattr(p, "Comment", ""))
                if pos_comment == expected_prefix or pos_comment.startswith(
                    f"{expected_prefix}_trade"
                ):
                    cmd = CopyCommand(
                        command_id=f"pos_mod_{master_ticket}_{fid}_{p.Position}",
                        master_id=master_id,
                        master_ticket=p.Position,
                        follower_id=fid,
                        action=ActionType.MODIFY,
                        symbol=pos_obj.Symbol,
                        volume=p.Volume,
                        order_type=p.Action,
                        price_sl=getattr(pos_obj, "PriceSL", 0.0) or 0.0,
                        price_tp=getattr(pos_obj, "PriceTP", 0.0) or 0.0,
                        comment=pos_comment,
                        created_ts=time.time(),
                    )
                    self.dispatch_parallel(cmd)

    def route_master_order_pending(self, order_obj: Any):
        """Normalize and execute pending order updates in parallel."""
        self._last_activity_ts = time.time()
        master_id = getattr(order_obj, "Login", 0)
        master_ticket = getattr(order_obj, "Order", 0)
        if not master_id or not master_ticket:
            return

        followers = self.cache.get_followers(self.manager_api, master_id)
        for fid in followers:
            cfg = self.cache.get_follower_config(fid)
            multi_count = cfg.multi_trade_count if cfg else 1

            for trade_idx in range(1, multi_count + 1):
                comment = (
                    f"{master_id}_{master_ticket}_trade{trade_idx}"
                    if multi_count > 1
                    else f"{master_id}_{master_ticket}"
                )
                cmd = CopyCommand(
                    command_id=f"ord_pending_{master_ticket}_{fid}_{trade_idx}",
                    master_id=master_id,
                    master_ticket=master_ticket,
                    follower_id=fid,
                    action=ActionType.PENDING_OPEN,
                    symbol=order_obj.Symbol,
                    volume=order_obj.VolumeCurrent,
                    order_type=order_obj.Type,
                    price_order=getattr(order_obj, "PriceOrder", 0.0) or 0.0,
                    price_trigger=getattr(order_obj, "PriceTrigger", 0.0) or 0.0,
                    price_sl=getattr(order_obj, "PriceSL", 0.0) or 0.0,
                    price_tp=getattr(order_obj, "PriceTP", 0.0) or 0.0,
                    comment=comment,
                    trade_index=trade_idx,
                    total_copies=multi_count,
                    created_ts=time.time(),
                )
                self.dispatch_parallel(cmd)

    def route_master_order_delete(self, order_obj: Any):
        """Normalize and execute pending order deletion in parallel."""
        self._last_activity_ts = time.time()
        master_id = getattr(order_obj, "Login", 0)
        master_ticket = getattr(order_obj, "Order", 0)
        if not master_id or not master_ticket:
            return

        followers = self.cache.get_followers(self.manager_api, master_id)
        expected_prefix = f"{master_id}_{master_ticket}"

        for fid in followers:
            follower_orders = self.manager_api.OrderGetOpen(fid) or []
            for o in follower_orders:
                if o.Comment == expected_prefix or o.Comment.startswith(
                    f"{expected_prefix}_trade"
                ):
                    cmd = CopyCommand(
                        command_id=f"ord_del_{master_ticket}_{fid}_{o.Order}",
                        master_id=master_id,
                        master_ticket=o.Order,
                        follower_id=fid,
                        action=ActionType.DELETE_ORDER,
                        symbol=order_obj.Symbol,
                        volume=o.VolumeCurrent,
                        order_type=o.Type,
                        comment=o.Comment,
                        created_ts=time.time(),
                    )
                    self.dispatch_parallel(cmd)

    def _create_dealer_sink(self) -> Any:
        class DealerSink:
            def OnDealerResult(self, result):
                retcode = getattr(result, "Retcode", 0)
                if retcode not in (10009, 10008):
                    logger.warning(f"[DEALER_SINK] Request rejected with retcode {retcode}")

            def OnDealerAnswer(self, answer):
                pass

        return DealerSink()
