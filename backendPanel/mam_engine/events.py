"""Event and Command Models for the MAM Copy Trading Engine."""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


class ActionType(str, Enum):
    OPEN = "OPEN"
    MODIFY = "MODIFY"
    CLOSE = "CLOSE"
    PARTIAL_CLOSE = "PARTIAL_CLOSE"
    DELETE_ORDER = "DELETE_ORDER"
    PENDING_OPEN = "PENDING_OPEN"
    PENDING_UPDATE = "PENDING_UPDATE"


@dataclass(frozen=True)
class CopyCommand:
    """Immutable normalized command representing a trade copy instruction."""

    command_id: str
    master_id: int
    master_ticket: int
    follower_id: int
    action: ActionType
    symbol: str
    volume: float
    order_type: int  # MT5 order type (0=BUY, 1=SELL, 2=BUYLIMIT, etc.)
    price_order: float = 0.0
    price_sl: float = 0.0
    price_tp: float = 0.0
    price_trigger: float = 0.0
    type_time: int = 0
    time_expiration: int = 0
    comment: str = ""
    trade_index: int = 1
    total_copies: int = 1
    created_ts: float = field(default_factory=time.time)

    @property
    def dedupe_key(self) -> str:
        """Unique logical operation key to guarantee idempotency."""
        if self.action in (ActionType.MODIFY, ActionType.PENDING_UPDATE):
            sl_str = f"{self.price_sl:.5f}"
            tp_str = f"{self.price_tp:.5f}"
            pr_str = f"{self.price_order:.5f}"
            time_str = f"{self.type_time}_{self.time_expiration}"
            if self.total_copies > 1:
                return f"{self.action.value}_{self.master_id}_{self.master_ticket}_{self.follower_id}_trade{self.trade_index}_pr{pr_str}_sl{sl_str}_tp{tp_str}_t{time_str}"
            return f"{self.action.value}_{self.master_id}_{self.master_ticket}_{self.follower_id}_pr{pr_str}_sl{sl_str}_tp{tp_str}_t{time_str}"

        if self.total_copies > 1:
            return f"{self.action.value}_{self.master_id}_{self.master_ticket}_{self.follower_id}_trade{self.trade_index}"
        return f"{self.action.value}_{self.master_id}_{self.master_ticket}_{self.follower_id}"


@dataclass
class TradeExecutionResult:
    """Container for the result of a trade copy execution."""

    command: CopyCommand
    success: bool
    retcode: int = 0
    error_message: str = ""
    follower_ticket: Optional[int] = None
    master_detect_ms: float = 0.0
    route_ms: float = 0.0
    queue_wait_ms: float = 0.0
    mt5_send_ms: float = 0.0
    total_latency_ms: float = 0.0
    verified: bool = False

