"""MT5 Dealer Execution Handler and Order Dispatcher."""

from __future__ import annotations

import logging
import time
from typing import Any, Optional

from backendPanel.mam_engine.events import ActionType, CopyCommand, TradeExecutionResult
from backendPanel.mam_engine.idempotency import (
    IdempotencyEngine,
    acquire_db_advisory_lock,
    release_db_advisory_lock,
)
from backendPanel.mam_engine.persistence import AsyncPersistenceManager
from backendPanel.mam_engine.routing_cache import FollowerConfig, RoutingCache

logger = logging.getLogger(__name__)


class MT5DealerExecutor:
    """Executes normalized trade commands against MetaTrader 5 Manager API."""

    def __init__(
        self,
        manager_api: Any,
        dealer_sink: Any,
        cache: RoutingCache,
        idempotency: IdempotencyEngine,
        persistence: AsyncPersistenceManager,
    ):
        self.manager_api = manager_api
        self.dealer_sink = dealer_sink
        self.cache = cache
        self.idempotency = idempotency
        self.persistence = persistence

    def execute_command(self, cmd: CopyCommand) -> TradeExecutionResult:
        """Executes a single normalized CopyCommand cleanly and idempotently."""
        start_time = time.time()
        dispatch_delay_ms = (start_time - cmd.created_ts) * 1000.0
        dedupe_key = cmd.dedupe_key

        # 1. In-flight claim check
        if not self.idempotency.try_claim_in_flight(dedupe_key):
            logger.info(
                f"[DEALER_BLOCKED] trade={dedupe_key} follower={cmd.follower_id} reason=IN_FLIGHT"
            )
            return TradeExecutionResult(
                command=cmd, success=False, error_message="In-flight execution locked"
            )

        try:
            # 2. Fast memory TTL idempotency check
            if self.idempotency.is_recently_processed(dedupe_key):
                logger.info(
                    f"[DEALER_BLOCKED] trade={dedupe_key} follower={cmd.follower_id} reason=RECENTLY_COMPLETED"
                )
                return TradeExecutionResult(
                    command=cmd, success=False, error_message="Recently completed"
                )

            # 3. Build MT5 Request object
            mt_req = self._build_mt5_request(cmd)
            if not mt_req:
                return TradeExecutionResult(
                    command=cmd, success=False, error_message="Failed to build MT5 request"
                )

            # 4. Dispatch to MT5 via DealerSend or OrderDelete
            mt5_send_start = time.time()
            success = False
            last_err = ""
            try:
                if cmd.action == ActionType.DELETE_ORDER:
                    ret = self.manager_api.OrderDelete(cmd.master_ticket)
                    if isinstance(ret, bool):
                        success = ret
                    elif isinstance(ret, tuple) and len(ret) > 1:
                        ret_code = ret[1]
                        success = (getattr(ret_code, "value", ret_code) == 0) or ("MT_RET_OK" in str(ret))
                    elif isinstance(ret, int):
                        success = (ret == 0 or ret == 10009)
                    else:
                        success = ("MT_RET_OK" in str(ret))
                    
                    if not success:
                        last_err = str(ret)
                else:
                    success = bool(self.manager_api.DealerSend(mt_req, self.dealer_sink))
            except Exception as ex:
                last_err = str(ex)
                logger.error(
                    f"[DEALER_ERROR] MT5 exception for follower {cmd.follower_id}: {ex}"
                )

            mt5_send_ms = (time.time() - mt5_send_start) * 1000.0
            total_latency_ms = (time.time() - start_time) * 1000.0

            if success:
                logger.info(
                    f"[COPY_SUCCESS] trade={dedupe_key} follower={cmd.follower_id} op={cmd.action.value} "
                    f"volume={cmd.volume:.2f} dispatch_delay={dispatch_delay_ms:.1f}ms mt5_send={mt5_send_ms:.1f}ms total={total_latency_ms:.1f}ms"
                )

                # Mark in memory & queue async DB persistence & verification
                self.idempotency.mark_processed(dedupe_key)
                self.persistence.enqueue_dedup_record(dedupe_key)
                self.persistence.enqueue_verification(self.manager_api, cmd)

                # Check for profit share handling on position close
                if cmd.action in (ActionType.CLOSE, ActionType.PARTIAL_CLOSE):
                    self.persistence.enqueue_profit_share(
                        self.manager_api, cmd.master_id, cmd.follower_id, cmd.master_ticket
                    )

                return TradeExecutionResult(
                    command=cmd,
                    success=True,
                    queue_wait_ms=dispatch_delay_ms,
                    mt5_send_ms=mt5_send_ms,
                    total_latency_ms=total_latency_ms,
                )
            else:
                last_err = ""
                try:
                    import MT5Manager

                    last_err = str(MT5Manager.LastError())
                except Exception:
                    pass

                logger.error(
                    f"[COPY_FAILED] trade={dedupe_key} follower={cmd.follower_id} op={cmd.action.value} "
                    f"mt5_send={mt5_send_ms:.1f}ms error={last_err}"
                )
                self.idempotency.unmark_processed(dedupe_key)
                return TradeExecutionResult(
                    command=cmd,
                    success=False,
                    error_message=last_err,
                    queue_wait_ms=dispatch_delay_ms,
                    mt5_send_ms=mt5_send_ms,
                    total_latency_ms=total_latency_ms,
                )
        finally:
            self.idempotency.release_in_flight(dedupe_key)

    def _build_mt5_request(self, cmd: CopyCommand) -> Any:
        """Construct native MT5 MTRequest instance from CopyCommand."""
        try:
            import MT5Manager

            req = MT5Manager.MTRequest(self.manager_api)
            req.Login = cmd.follower_id
            req.Symbol = cmd.symbol
            req.Volume = cmd.volume
            req.Comment = cmd.comment

            if cmd.action in (ActionType.OPEN, ActionType.PARTIAL_CLOSE):
                req.Action = 200  # DEALER_ACTION_BUY / SELL
                req.Type = cmd.order_type
                req.PriceOrder = cmd.price_order
                if cmd.price_sl > 0:
                    req.PriceSL = cmd.price_sl
                if cmd.price_tp > 0:
                    req.PriceTP = cmd.price_tp

            elif cmd.action == ActionType.CLOSE:
                req.Action = 200
                req.Type = cmd.order_type  # Reverse order type for close
                req.PriceOrder = cmd.price_order
                if cmd.master_ticket > 0:
                    req.Position = cmd.master_ticket

            elif cmd.action == ActionType.MODIFY:
                req.Action = 202  # POSITION_MODIFY
                if cmd.master_ticket > 0:
                    req.Position = cmd.master_ticket
                req.PriceSL = cmd.price_sl
                req.PriceTP = cmd.price_tp

            elif cmd.action == ActionType.PENDING_OPEN:
                req.Action = 201
                req.Type = cmd.order_type
                req.PriceOrder = cmd.price_order
                req.PriceTrigger = cmd.price_trigger
                req.PriceSL = cmd.price_sl
                req.PriceTP = cmd.price_tp
                req.TypeTime = 0  # ORDER_TIME_GTC
                req.TypeFill = 2  # ORDER_FILLING_RETURN

            elif cmd.action == ActionType.PENDING_UPDATE:
                req.Action = 203  # TA_DEALER_ORD_MODIFY
                if cmd.master_ticket > 0:
                    req.Order = cmd.master_ticket
                req.Type = cmd.order_type
                req.PriceOrder = cmd.price_order
                req.PriceTrigger = cmd.price_trigger
                req.PriceSL = cmd.price_sl
                req.PriceTP = cmd.price_tp
                req.TypeTime = 0  # ORDER_TIME_GTC

            elif cmd.action == ActionType.DELETE_ORDER:
                req.Action = 204
                if cmd.master_ticket > 0:
                    req.Order = cmd.master_ticket

            return req
        except Exception as e:
            logger.error(f"[DEALER] Failed to build MT5 request for command {cmd.command_id}: {e}")
            return None

