"""Helpers for resolving the current admin user's display identity."""

from __future__ import annotations

from adminPanel.models import AdminUser
from backendPanel.database import ensure_db_initialized
from clientPanel.view.common import get_admin_request_token, load_admin_login_token


async def resolve_admin_display_name(request) -> str | None:
    """Resolve the current admin's display name from the request or signed token."""

    await ensure_db_initialized()

    for attr in ("admin_user", "auth_user", "user"):
        user = getattr(request, attr, None)
        if user is None or not getattr(user, "is_authenticated", False):
            continue

        name = str(getattr(user, "name", None) or getattr(user, "email", None) or "").strip()
        if name:
            return name

        user_id = getattr(user, "id", None)
        if user_id is not None:
            admin_user = await AdminUser.filter(id=int(user_id)).first()
            if admin_user is not None:
                return str(admin_user.name or admin_user.email or "").strip() or None

    token = get_admin_request_token(request)
    if not token:
        return None

    payload = load_admin_login_token(token)
    if payload is None:
        return None

    user_id = payload.get("user_id")
    if user_id is not None:
        admin_user = await AdminUser.filter(id=int(user_id)).first()
        if admin_user is not None:
            return str(admin_user.name or admin_user.email or "").strip() or None

    return str(payload.get("name") or payload.get("email") or "").strip() or None


def normalize_approved_by(value: str | None) -> str | None:
    """Treat legacy placeholder approvers as missing data."""

    label = str(value or "").strip()
    if not label:
        return None
    if label.lower() == "admin":
        return None
    return label


def normalize_transaction_source(value: str | None) -> str | None:
    """Normalize a transaction source label and drop legacy admin placeholders."""

    label = str(value or "").strip()
    if not label:
        return None

    lowered = label.lower()
    if lowered in {"admin", "admin operation"}:
        return None
    if lowered.startswith("admin "):
        label = label[6:].strip()
    return label or None
