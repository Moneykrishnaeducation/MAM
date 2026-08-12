"""Partitioned Follower Execution Actor Engine.

Guarantees:
1. Followers execute independently (Follower A || Follower B).
2. For any single follower, commands execute strictly in FIFO order (OPEN -> MODIFY -> CLOSE).
3. Slow execution on one follower never blocks other followers or master monitors.
"""

from __future__ import annotations

import logging
import queue
import threading
import time
from typing import Callable, Dict, Optional

from backendPanel.mam_engine.events import CopyCommand, TradeExecutionResult

logger = logging.getLogger(__name__)


class FollowerExecutionPartition:
    """Actor managing a single follower's ordered execution queue."""

    def __init__(self, follower_id: int, handler: Callable[[CopyCommand], TradeExecutionResult]):
        self.follower_id = follower_id
        self._handler = handler
        self._queue: queue.Queue[Optional[CopyCommand]] = queue.Queue(maxsize=1000)
        self._thread: Optional[threading.Thread] = None
        self._active = False
        self._lock = threading.Lock()
        self._last_active_ts = time.time()

    def start(self):
        with self._lock:
            if not self._active:
                self._active = True
                self._thread = threading.Thread(
                    target=self._run_loop,
                    name=f"FollowerActor_{self.follower_id}",
                    daemon=True,
                )
                self._thread.start()

    def submit(self, command: CopyCommand) -> bool:
        """Enqueue command for execution. Bounded queue prevents unlimited memory growth."""
        self.start()
        self._last_active_ts = time.time()
        try:
            self._queue.put_nowait(command)
            return True
        except queue.Full:
            logger.warning(
                f"[ACTOR] Follower {self.follower_id} queue full! Dropping command {command.command_id}"
            )
            return False

    def _run_loop(self):
        while self._active:
            try:
                cmd = self._queue.get(timeout=30.0)
                if cmd is None:  # Shutdown poison pill
                    break
                self._handler(cmd)
                self._queue.task_done()
                self._last_active_ts = time.time()
            except queue.Empty:
                # Check for actor idle timeout (clean shutdown after 60s idle)
                if time.time() - self._last_active_ts > 60.0 and self._queue.empty():
                    with self._lock:
                        self._active = False
                        break
            except Exception as e:
                logger.error(
                    f"[ACTOR] Exception executing command on FollowerActor {self.follower_id}: {e}"
                )

    def stop(self):
        with self._lock:
            self._active = False
            try:
                self._queue.put_nowait(None)
            except Exception:
                pass


class FollowerPartitionManager:
    """Manages active follower actor partitions dynamically."""

    def __init__(self, handler: Callable[[CopyCommand], TradeExecutionResult]):
        self._handler = handler
        self._partitions: Dict[int, FollowerExecutionPartition] = {}
        self._lock = threading.Lock()

    def get_or_create(self, follower_id: int) -> FollowerExecutionPartition:
        with self._lock:
            partition = self._partitions.get(follower_id)
            if partition is None or not partition._active:
                partition = FollowerExecutionPartition(follower_id, self._handler)
                partition.start()
                self._partitions[follower_id] = partition
            return partition

    def dispatch(self, command: CopyCommand) -> bool:
        partition = self.get_or_create(command.follower_id)
        return partition.submit(command)

    def stop_all(self):
        with self._lock:
            for p in self._partitions.values():
                p.stop()
            self._partitions.clear()
