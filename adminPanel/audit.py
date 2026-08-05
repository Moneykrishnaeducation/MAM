"""Shared audit logging helpers."""

from __future__ import annotations

import logging
from typing import Any

from adminPanel.models import ActivityLog
from backendPanel.database import ensure_db_initialized

logger = logging.getLogger(__name__)


def _get_request_ip(request) -> str | None:
    meta = getattr(request, "META", {})
    forwarded_for = meta.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return str(forwarded_for).split(",")[0].strip() or None

    remote_addr = meta.get("REMOTE_ADDR")
    if not remote_addr:
        return None
    return str(remote_addr).strip() or None


def _get_request_user_agent(request) -> str | None:
    user_agent = getattr(request, "META", {}).get("HTTP_USER_AGENT")
    if not user_agent:
        return None
    return str(user_agent).strip() or None


async def create_audit_log(
    request,
    *,
    user_name: str,
    user_email: str | None = None,
    user_role: str,
    action_type: str,
    module_name: str = "Authentication",
    record_id: str | int | None = None,
    old_values: dict[str, Any] | None = None,
    new_values: dict[str, Any] | None = None,
    user_id: int | None = None,
) -> ActivityLog | None:
    """Create a best-effort audit log row.

    Logging errors should never block auth flows, so failures are swallowed
    after being written to the application logger.
    """
    try:
        await ensure_db_initialized()
        return await ActivityLog.create(
            user_email=str(user_email or user_name).strip() or "Unknown",
            action=str(action_type).strip() or "Unknown",
            details=module_name,
            user_name=str(user_name).strip() or "Unknown",
            user_role=str(user_role).strip() or "Admin",
            action_type=str(action_type).strip() or "Unknown",
            module_name=str(module_name).strip() or "general",
            record_id=str(record_id).strip() if record_id is not None else None,
            old_values=old_values,
            new_values=new_values,
            ip_address=_get_request_ip(request),
            user_agent=_get_request_user_agent(request),
            user_id=user_id,
        )
    except Exception:
        logger.exception("Failed to create audit log entry")
        return None
