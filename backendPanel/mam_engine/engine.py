"""Main Orchestration Engine and Parallel Event Router for Pure Non-Queued Execution."""

from __future__ import annotations

import logging
import threading
import time
from typing import Any

from backendPanel.mam_engine.dealer import MT5DealerExecutor
from backendPanel.mam_engine.events import ActionType, CopyCommand
from backendPanel.mam_engine.idempotency import IdempotencyEngine
from backendPanel.mam_engine.persistence import AsyncPersistenceManager
from backendPanel.mam_engine.reconciler import StatefulReconciler
from backendPanel.mam_engine.routing_cache import RoutingCache

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

        # If this position originated from a triggered pending order, clean up the follower's pending orders
        # to prevent the follower from having both a market order (copied here) AND a pending order that triggers later.
        orig_order_ticket = getattr(order_obj, "Order", 0)
        if orig_order_ticket > 0 or getattr(order_obj, "State", 0) == 4:
            try:
                class MockOrder:
                    pass
                mock = MockOrder()
                mock.Login = master_id
                mock.Order = master_ticket
                mock.Symbol = getattr(order_obj, "Symbol", "")
                self.route_master_order_delete(mock)
            except Exception as e:
                logger.debug(f"[ENGINE_CLEANUP] Failed to cleanup pending orders for {master_ticket}: {e}")

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
                already_open = False
                for c in existing_comments:
                    if c == comment or (c.startswith(comment) and (len(c) == len(comment) or not c[len(comment)].isdigit())):
                        already_open = True
                        break

                if already_open:
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
        if not followers:
            return

        leader_user = self.cache.get_user(self.manager_api, master_id)
        leader_balance = getattr(leader_user, "Balance", 1.0) or 1.0
        symbol_info = self.cache.get_symbol(self.manager_api, order_obj.Symbol)
        symbol_min_vol = getattr(symbol_info, "VolumeMin", 0.01) or 0.01

        base_vol = getattr(order_obj, "VolumeCurrent", getattr(order_obj, "VolumeInitial", 0.0)) or 0.0

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

            follower_orders = self.manager_api.OrderGetOpen(fid) or []
            existing_orders = {str(getattr(o, "Comment", "")): getattr(o, "Order", 0) for o in follower_orders}

            follower_positions = self.manager_api.PositionGet(fid) or []
            existing_position_comments = {str(getattr(p, "Comment", "")) for p in follower_positions}

            for trade_idx in range(1, multi_count + 1):
                comment = (
                    f"{master_id}_{master_ticket}_trade{trade_idx}"
                    if multi_count > 1
                    else f"{master_id}_{master_ticket}"
                )

                found_ticket = 0
                for ext_comment, t_id in existing_orders.items():
                    # Exact match or starts with comment plus a non-digit (to prevent trade1 matching trade10)
                    if ext_comment == comment or (ext_comment.startswith(comment) and (len(ext_comment) == len(comment) or not ext_comment[len(comment)].isdigit())):
                        found_ticket = t_id
                        break

                if found_ticket > 0:
                    follower_ticket = found_ticket
                    action = ActionType.PENDING_UPDATE
                    cmd_id = f"ord_upd_{master_ticket}_{fid}_{follower_ticket}"
                    target_ticket = follower_ticket
                else:
                    # Check if it already triggered into a position
                    already_triggered = False
                    for ext_comment in existing_position_comments:
                        if ext_comment == comment or (ext_comment.startswith(comment) and (len(ext_comment) == len(comment) or not ext_comment[len(comment)].isdigit())):
                            already_triggered = True
                            break

                    if already_triggered:
                        logger.info(f"[ENGINE_SKIP] Follower {fid} already has open position for pending order {comment}. Skipping PENDING_OPEN.")
                        continue

                    action = ActionType.PENDING_OPEN
                    cmd_id = f"ord_pending_{master_ticket}_{fid}_{trade_idx}"
                    target_ticket = master_ticket

                cmd = CopyCommand(
                    command_id=cmd_id,
                    master_id=master_id,
                    master_ticket=target_ticket,
                    follower_id=fid,
                    action=action,
                    symbol=order_obj.Symbol,
                    volume=final_vol,
                    order_type=order_obj.Type,
                    price_order=getattr(order_obj, "PriceOrder", 0.0) or 0.0,
                    price_trigger=getattr(order_obj, "PriceTrigger", 0.0) or 0.0,
                    price_sl=getattr(order_obj, "PriceSL", 0.0) or 0.0,
                    price_tp=getattr(order_obj, "PriceTP", 0.0) or 0.0,
                    type_time=getattr(order_obj, "TypeTime", 0),
                    time_expiration=getattr(order_obj, "TimeExpiration", 0),
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
        retcode_map = {
            10004: "TRADE_RETCODE_REQUOTE",
            10006: "TRADE_RETCODE_REJECT (Request rejected by dealer)",
            10008: "TRADE_RETCODE_PLACED (Order placed)",
            10009: "TRADE_RETCODE_DONE (Request completed successfully)",
            10010: "TRADE_RETCODE_DONE_PARTIAL",
            10011: "TRADE_RETCODE_ERROR",
            10012: "TRADE_RETCODE_TIMEOUT",
            10013: "TRADE_RETCODE_INVALID",
            10014: "TRADE_RETCODE_INVALID_VOLUME",
            10015: "TRADE_RETCODE_INVALID_PRICE",
            10016: "TRADE_RETCODE_INVALID_STOPS",
            10017: "TRADE_RETCODE_TRADE_DISABLED",
            10018: "TRADE_RETCODE_MARKET_CLOSED",
            10019: "TRADE_RETCODE_NO_MONEY (Insufficient funds/margin on follower account)",
            10020: "TRADE_RETCODE_PRICE_CHANGED",
            10021: "TRADE_RETCODE_PRICE_OFF",
            10022: "TRADE_RETCODE_TOO_MANY_REQUESTS",
        }

        class DealerSink:
            def OnDealerResult(self, result):
                retcode = getattr(result, "Retcode", 0)
                if retcode not in (10009, 10008):
                    desc = retcode_map.get(retcode, f"Retcode {retcode}")
                    logger.warning(
                        f"[DEALER_SINK] Request rejected with retcode {retcode} ({desc})"
                    )

            def OnDealerAnswer(self, answer):
                pass

        return DealerSink()
