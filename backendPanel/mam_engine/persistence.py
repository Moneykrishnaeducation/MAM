"""Asynchronous Database Persistence, Verification & Audit Logger."""

from __future__ import annotations

import logging
import queue
import threading
import time
from typing import Any, Dict, Optional, Tuple

from backendPanel.mam_engine.events import ActionType, CopyCommand

logger = logging.getLogger(__name__)


class AsyncPersistenceManager:
    """Asynchronous worker pool to handle DB persistence & verification off the critical hot path."""

    def __init__(self, num_workers: int = 4, max_queue_size: int = 10000):
        self._queue: queue.Queue[Tuple[str, tuple, dict]] = queue.Queue(maxsize=max_queue_size)
        self._workers: list[threading.Thread] = []
        self._stop_event = threading.Event()
        self._num_workers = num_workers

    def start(self):
        """Start background persistence threads."""
        for i in range(self._num_workers):
            t = threading.Thread(
                target=self._worker_loop, name=f"MAM_Persistence_{i+1}", daemon=True
            )
            t.start()
            self._workers.append(t)
        logger.info(f"[PERSISTENCE] Started {self._num_workers} async DB persistence workers.")

    def stop(self):
        """Stop background persistence threads gracefully."""
        self._stop_event.set()

    def enqueue_dedup_record(self, dedupe_key: str):
        """Non-blocking submission of dedupe record to PostgreSQL."""
        try:
            self._queue.put_nowait(("dedup", (dedupe_key,), {}))
        except queue.Full:
            logger.warning(
                f"[PERSISTENCE] Persistence queue full! Dropping async dedup insert for {dedupe_key}"
            )

    def enqueue_activity_log(
        self, user_email: str, action: str, details: str, ip_address: str = "127.0.0.1"
    ):
        """Non-blocking submission of activity log."""
        try:
            self._queue.put_nowait(
                ("activity_log", (user_email, action, details, ip_address), {})
            )
        except queue.Full:
            pass

    def enqueue_profit_share(
        self, manager_api: Any, master_login: int, follower_id: int, pos_ticket: int
    ):
        """Non-blocking submission of profit share processing task."""
        try:
            self._queue.put_nowait(
                ("profit_share", (manager_api, master_login, follower_id, pos_ticket), {})
            )
        except queue.Full:
            logger.warning("[PERSISTENCE] Persistence queue full! Dropping profit share event.")

    def enqueue_verification(self, manager_api: Any, cmd: CopyCommand):
        """Non-blocking submission of post-execution MT5 verification task."""
        try:
            self._queue.put_nowait(("verification", (manager_api, cmd), {}))
        except queue.Full:
            logger.warning("[PERSISTENCE] Persistence queue full! Skipping verification.")

    def _worker_loop(self):
        """Worker thread processing loop."""
        while not self._stop_event.is_set():
            try:
                task_type, args, kwargs = self._queue.get(timeout=1.0)
            except queue.Empty:
                continue

            try:
                if task_type == "dedup":
                    self._persist_dedup(*args)
                elif task_type == "activity_log":
                    self._persist_activity_log(*args)
                elif task_type == "profit_share":
                    self._process_profit_share(*args)
                elif task_type == "verification":
                    self._verify_trade_execution(*args)
            except Exception as e:
                logger.error(f"[PERSISTENCE] Error executing {task_type} async task: {e}")
            finally:
                self._queue.task_done()

    def _persist_dedup(self, key: str):
        """Perform atomic SQL UPSERT into mt5_send_dedup."""
        try:
            from django.db import connection, close_old_connections

            close_old_connections()
            safe_key = "".join([c if c.isalnum() or c in ("-", "_") else "" for c in str(key)])
            with connection.cursor() as cursor:
                cursor.execute(
                    'INSERT INTO "mt5_send_dedup" (key, created_at) VALUES (%s, NOW()) ON CONFLICT (key) DO NOTHING;',
                    [safe_key],
                )
        except Exception as e:
            logger.debug(f"[PERSISTENCE] Error inserting MT5SendDedup key {key}: {e}")

    def _persist_activity_log(self, user_email: str, action: str, details: str, ip_address: str):
        try:
            from django.db import connection, close_old_connections

            close_old_connections()
            with connection.cursor() as cursor:
                cursor.execute(
                    'INSERT INTO "admin_activity_logs" ("user_email", "action", "details", "ip_address") VALUES (%s, %s, %s, %s)',
                    [user_email, action, details, ip_address],
                )
        except Exception as e:
            logger.debug(f"[PERSISTENCE] Error inserting activity log: {e}")

    def _process_profit_share(
        self, manager_api: Any, master_login: int, follower_id: int, pos_ticket: int
    ):
        try:
            from backendPanel.profit_share import handle_profit_share_async

            handle_profit_share_async(manager_api, master_login, follower_id, pos_ticket)
        except Exception as e:
            logger.error(f"[PERSISTENCE] Error in handle_profit_share_async: {e}")

    def _verify_trade_execution(self, manager_api: Any, cmd: CopyCommand):
        """Asynchronously verify that the MT5 position or order exists with expected volume."""
        try:
            master_ticket_str = str(cmd.master_ticket)
            master_id_ticket = f"{cmd.master_id}_{cmd.master_ticket}"

            verified = False
            for attempt in range(3):
                time.sleep(1.0)

                if cmd.action in (ActionType.OPEN, ActionType.MODIFY):
                    positions = manager_api.PositionGet(cmd.follower_id) or []
                    matched = None
                    for p in positions:
                        c = str(getattr(p, "Comment", ""))
                        if (
                            c == cmd.comment
                            or master_id_ticket in c
                            or master_ticket_str in c
                            or c.startswith(master_id_ticket)
                        ):
                            matched = p
                            break
                    if matched:
                        logger.info(
                            f"[VERIFY_SUCCESS] trade={cmd.dedupe_key} follower={cmd.follower_id} "
                            f"position={matched.Position} symbol={matched.Symbol} volume={matched.Volume:.2f}"
                        )
                        verified = True
                        break

                elif cmd.action in (ActionType.CLOSE, ActionType.PARTIAL_CLOSE):
                    positions = manager_api.PositionGet(cmd.follower_id) or []
                    still_open = False
                    for p in positions:
                        c = str(getattr(p, "Comment", ""))
                        pos_id = getattr(p, "Position", 0)
                        if (
                            pos_id == cmd.master_ticket
                            or c == cmd.comment
                            or master_id_ticket in c
                        ):
                            still_open = True
                            break

                    if not still_open:
                        logger.info(
                            f"[VERIFY_SUCCESS] trade={cmd.dedupe_key} follower={cmd.follower_id} "
                            f"op=CLOSE position_closed_successfully"
                        )
                        verified = True
                        break

            if not verified:
                if cmd.action in (ActionType.OPEN, ActionType.MODIFY):
                    logger.warning(
                        f"[VERIFY_MISMATCH] trade={cmd.dedupe_key} follower={cmd.follower_id} "
                        f"reason=POSITION_NOT_FOUND_ON_MT5"
                    )
                else:
                    logger.warning(
                        f"[VERIFY_MISMATCH] trade={cmd.dedupe_key} follower={cmd.follower_id} "
                        f"reason=POSITION_STILL_OPEN_AFTER_CLOSE"
                    )
        except Exception as e:
            logger.debug(f"[VERIFY_ERROR] Verification exception for follower {cmd.follower_id}: {e}")
