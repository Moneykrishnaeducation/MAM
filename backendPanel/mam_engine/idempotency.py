"""Multi-Layer Atomic Idempotency & De-duplication Engine."""

from __future__ import annotations

import logging
import threading
import time
import zlib
from typing import Dict, Optional, Set, Tuple

logger = logging.getLogger(__name__)

DEFAULT_TTL_SECONDS = 300.0  # 5 minutes
MAX_REGISTRY_SIZE = 20000


class IdempotencyEngine:
    """Multi-layer thread-safe idempotency checker to eliminate duplicate trades."""

    def __init__(self, ttl_seconds: float = DEFAULT_TTL_SECONDS):
        self._ttl = ttl_seconds
        self._lock = threading.RLock()
        self._in_flight: Set[str] = set()
        self._recent_copies: Dict[str, float] = {}
        self._recent_positions: Dict[int, float] = {}

    def preload_from_db(self):
        """Preload recently executed dedupe keys from PostgreSQL to survive server restarts."""
        try:
            from django.db import connection, close_old_connections

            close_old_connections()
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT key, extract(epoch from created_at) FROM mt5_send_dedup WHERE created_at > NOW() - INTERVAL '6 hours';"
                )
                rows = cursor.fetchall()
                with self._lock:
                    for key, created_epoch in rows:
                        self._recent_copies[str(key)] = float(created_epoch)
            logger.info(f"[IDEMPOTENCY] Preloaded {len(rows)} dedupe keys from database on startup.")
        except Exception as e:
            logger.warning(f"[IDEMPOTENCY] Could not preload dedupe keys from DB: {e}")

    def try_claim_in_flight(self, key: str) -> bool:
        """Atomically attempt to claim an in-flight trade key. Returns True if claimed."""
        with self._lock:
            if key in self._in_flight:
                return False
            self._in_flight.add(key)
            return True

    def release_in_flight(self, key: str):
        """Release an in-flight execution lock."""
        with self._lock:
            self._in_flight.discard(key)

    def is_recently_processed(self, key: str) -> bool:
        """Check if an operation key was completed within the TTL window."""
        now = time.time()
        with self._lock:
            if key in self._recent_copies:
                ts = self._recent_copies[key]
                if now - ts < self._ttl:
                    return True
                else:
                    self._recent_copies.pop(key, None)
        return False

    def mark_processed(self, key: str):
        """Mark an operation key as successfully executed."""
        now = time.time()
        with self._lock:
            self._recent_copies[key] = now
            self._evict_expired_unlocked(now)

    def unmark_processed(self, key: str):
        """Remove processed mark (used when execution fails and requires retry)."""
        with self._lock:
            self._recent_copies.pop(key, None)

    def is_master_position_processed(self, master_pos_id: int) -> bool:
        """Check if a master position ID was processed recently."""
        now = time.time()
        with self._lock:
            if master_pos_id in self._recent_positions:
                ts = self._recent_positions[master_pos_id]
                if now - ts < self._ttl:
                    return True
                else:
                    self._recent_positions.pop(master_pos_id, None)
        return False

    def mark_master_position_processed(self, master_pos_id: int):
        """Mark a master position ID as processed."""
        now = time.time()
        with self._lock:
            self._recent_positions[master_pos_id] = time.time()

    def _evict_expired_unlocked(self, now: float):
        """Internal helper to clean up old entries."""
        if len(self._recent_copies) > MAX_REGISTRY_SIZE:
            expired = [k for k, ts in self._recent_copies.items() if now - ts > self._ttl]
            for k in expired:
                self._recent_copies.pop(k, None)


def acquire_db_advisory_lock(key_str: str) -> bool:
    """Acquire a 64-bit PostgreSQL advisory lock using two 32-bit keys."""
    try:
        from django.db import connection, close_old_connections

        close_old_connections()
        key1 = zlib.crc32(key_str.encode("utf-8")) & 0x7FFFFFFF
        key2 = zlib.crc32(f"salt_{key_str}".encode("utf-8")) & 0x7FFFFFFF
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_try_advisory_lock(%s, %s);", [key1, key2])
            res = cursor.fetchone()
            return bool(res[0]) if res else False
    except Exception as e:
        logger.warning(f"[IDEMPOTENCY] Advisory lock failed for {key_str}: {e}. Failing safe.")
        return False


def release_db_advisory_lock(key_str: str):
    """Release 64-bit PostgreSQL advisory lock."""
    try:
        from django.db import connection

        key1 = zlib.crc32(key_str.encode("utf-8")) & 0x7FFFFFFF
        key2 = zlib.crc32(f"salt_{key_str}".encode("utf-8")) & 0x7FFFFFFF
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_advisory_unlock(%s, %s);", [key1, key2])
    except Exception:
        pass
