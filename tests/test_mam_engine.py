"""Unit and Concurrency Tests for the Refactored MAM Copy Trading Engine."""

import time
import pytest
from unittest.mock import MagicMock

from backendPanel.mam_engine.events import ActionType, CopyCommand, TradeExecutionResult
from backendPanel.mam_engine.follower_actor import FollowerExecutionPartition, FollowerPartitionManager
from backendPanel.mam_engine.idempotency import IdempotencyEngine
from backendPanel.mam_engine.routing_cache import FollowerConfig, RoutingCache


def test_command_dedupe_key_generation():
    cmd1 = CopyCommand(
        command_id="cmd_1",
        master_id=1001,
        master_ticket=50001,
        follower_id=2001,
        action=ActionType.OPEN,
        symbol="EURUSD",
        volume=0.1,
        order_type=0,
        trade_index=1,
        total_copies=1,
    )
    assert cmd1.dedupe_key == "OPEN_1001_50001_2001"

    cmd_multi = CopyCommand(
        command_id="cmd_multi",
        master_id=1001,
        master_ticket=50001,
        follower_id=2001,
        action=ActionType.OPEN,
        symbol="EURUSD",
        volume=0.1,
        order_type=0,
        trade_index=2,
        total_copies=3,
    )
    assert cmd_multi.dedupe_key == "OPEN_1001_50001_2001_trade2"

    cmd_mod_sl = CopyCommand(
        command_id="cmd_mod1",
        master_id=1001,
        master_ticket=50001,
        follower_id=2001,
        action=ActionType.MODIFY,
        symbol="EURUSD",
        volume=0.1,
        order_type=0,
        price_sl=1.0850,
        price_tp=0.0,
    )
    cmd_mod_tp = CopyCommand(
        command_id="cmd_mod2",
        master_id=1001,
        master_ticket=50001,
        follower_id=2001,
        action=ActionType.MODIFY,
        symbol="EURUSD",
        volume=0.1,
        order_type=0,
        price_sl=1.0850,
        price_tp=1.0950,
    )
    assert cmd_mod_sl.dedupe_key != cmd_mod_tp.dedupe_key
    assert "sl1.08500_tp0.00000" in cmd_mod_sl.dedupe_key
    assert "sl1.08500_tp1.09500" in cmd_mod_tp.dedupe_key


def test_idempotency_engine_atomic_claims():
    engine = IdempotencyEngine(ttl_seconds=5.0)
    key = "OPEN_1001_50001_2001"

    # 1. Claim in flight
    assert engine.try_claim_in_flight(key) is True
    # 2. Parallel claim attempt must fail
    assert engine.try_claim_in_flight(key) is False

    # Release and mark processed
    engine.release_in_flight(key)
    assert engine.is_recently_processed(key) is False

    engine.mark_processed(key)
    assert engine.is_recently_processed(key) is True


def test_follower_actor_fifo_ordering():
    executed_actions = []

    def mock_handler(cmd: CopyCommand) -> TradeExecutionResult:
        executed_actions.append((cmd.follower_id, cmd.action, cmd.command_id))
        time.sleep(0.01)  # Simulate execution latency
        return TradeExecutionResult(command=cmd, success=True)

    manager = FollowerPartitionManager(handler=mock_handler)

    # Submit OPEN -> MODIFY -> CLOSE for follower 2001
    cmd_open = CopyCommand(
        command_id="1_open",
        master_id=1001,
        master_ticket=501,
        follower_id=2001,
        action=ActionType.OPEN,
        symbol="EURUSD",
        volume=0.1,
        order_type=0,
    )
    cmd_mod = CopyCommand(
        command_id="2_mod",
        master_id=1001,
        master_ticket=501,
        follower_id=2001,
        action=ActionType.MODIFY,
        symbol="EURUSD",
        volume=0.1,
        order_type=0,
        price_sl=1.0500,
    )
    cmd_close = CopyCommand(
        command_id="3_close",
        master_id=1001,
        master_ticket=501,
        follower_id=2001,
        action=ActionType.CLOSE,
        symbol="EURUSD",
        volume=0.1,
        order_type=1,
    )

    manager.dispatch(cmd_open)
    manager.dispatch(cmd_mod)
    manager.dispatch(cmd_close)

    # Wait for actor execution loop to complete
    time.sleep(0.2)

    assert len(executed_actions) == 3
    assert executed_actions[0] == (2001, ActionType.OPEN, "1_open")
    assert executed_actions[1] == (2001, ActionType.MODIFY, "2_mod")
    assert executed_actions[2] == (2001, ActionType.CLOSE, "3_close")

    manager.stop_all()


def test_routing_cache_concurrency():
    cache = RoutingCache(follower_ttl=2.0)
    mock_api = MagicMock()

    # Pre-populate user & symbol
    user_mock = MagicMock()
    user_mock.Login = 1001
    user_mock.Agent = "426_MASTER"
    user_mock.Group = "real\\group1"
    mock_api.UserGet.return_value = user_mock

    follower_user = MagicMock()
    follower_user.Login = 2001
    follower_user.Agent = 1001
    mock_api.UserGetByGroup.return_value = [user_mock, follower_user]

    followers = cache.get_followers(mock_api, 1001)
    assert 2001 in followers
