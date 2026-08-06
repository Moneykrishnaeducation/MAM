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


async def log_post_activity(request, response=None) -> ActivityLog | None:
    """Automatic audit log recorder for POST/PUT/DELETE requests across all endpoints."""
    if request.method not in {"POST", "PUT", "DELETE", "PATCH"}:
        return None

    try:
        await ensure_db_initialized()
        path = request.path or ""

        # Ignore noisy / login status polling paths if needed
        if path.endswith("/login") or path.endswith("/logout"):
            return None

        # Resolve user identity
        user_name = "Unknown"
        user_email = "Unknown"
        user_role = "User"
        user_id = None

        from clientPanel.view.common import (
            get_admin_request_token,
            get_client_request_token,
            load_admin_login_token,
            load_client_login_token,
        )

        admin_token = get_admin_request_token(request)
        if admin_token:
            payload = load_admin_login_token(admin_token)
            if payload:
                user_name = payload.get("email", "Admin User")
                user_email = payload.get("email", "admin@mam.com")
                user_role = str(payload.get("role", "Admin")).capitalize()
                user_id = payload.get("user_id") or payload.get("sub")

        if user_name == "Unknown":
            client_token = get_client_request_token(request)
            if client_token:
                payload = load_client_login_token(client_token)
                if payload:
                    user_id = payload.get("client_id") or payload.get("sub")
                    user_email = payload.get("email", "client@mam.com")
                    user_name = payload.get("email", "Client User")
                    user_role = "Client"

        # Determine module name and action from URL path
        parts = [p for p in path.strip("/").split("/") if p]
        module = parts[1] if len(parts) > 1 else (parts[0] if parts else "general")

        # Parse request body payload
        new_values = None
        try:
            if request.body:
                import json
                body_data = json.loads(request.body.decode("utf-8"))
                if isinstance(body_data, dict):
                    # Mask sensitive keys
                    new_values = {
                        k: ("***" if "password" in k.lower() or "secret" in k.lower() else v)
                        for k, v in body_data.items()
                    }
        except Exception:
            pass

        return await create_audit_log(
            request,
            user_name=user_name,
            user_email=user_email,
            user_role=user_role,
            action_type=f"{request.method} {path}",
            module_name=module,
            new_values=new_values,
            user_id=user_id,
        )
    except Exception:
        logger.exception("Failed to auto-log POST activity")
        return None


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
    """Create a best-effort audit log row."""
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
