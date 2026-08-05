"""Reusable permission helpers for admin and client request handlers.

Admin roles (stored in AdminUser.role and embedded in the JWT payload):
    SuperAdmin  – full system access; can manage all admin users and settings
    Admin       – standard admin access; cannot promote/delete SuperAdmins
    Viewer      – read-only admin access; no write operations allowed
"""

from __future__ import annotations

from collections.abc import Callable
from functools import wraps
from inspect import iscoroutinefunction
from typing import Any

from asgiref.sync import async_to_sync
from django.http import JsonResponse

from backendPanel.database import ensure_db_initialized
from clientPanel.view.common import (
    get_admin_request_token,
    get_client_request_token,
    load_admin_login_token,
    load_client_login_token,
)

# ---------------------------------------------------------------------------
# Valid admin role constants (must match AdminUser.role values in DB)
# ---------------------------------------------------------------------------
ROLE_SUPERADMIN = "superadmin"
ROLE_ADMIN = "admin"
ROLE_VIEWER = "viewer"
ROLE_CLIENT = "client"

ADMIN_ROLES: frozenset[str] = frozenset({ROLE_SUPERADMIN, ROLE_ADMIN, ROLE_VIEWER})

# Role hierarchy weight – higher number = more privilege
_ROLE_WEIGHT: dict[str, int] = {
    ROLE_SUPERADMIN: 30,
    ROLE_ADMIN: 20,
    ROLE_VIEWER: 10,
    ROLE_CLIENT: 0,
}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _normalize_role(value: Any) -> str | None:
    """Return a lower-cased, stripped role string or None."""
    if value is None:
        return None
    role = str(value).strip().lower()
    return role or None


def _canonical_admin_role(raw: str | None) -> str | None:
    """Map raw role strings (e.g. 'Admin', 'Super Admin') to canonical lowercase."""
    if raw is None:
        return None
    r = raw.strip().lower().replace(" ", "")
    if r in ("superadmin", "super_admin"):
        return ROLE_SUPERADMIN
    if r == "admin":
        return ROLE_ADMIN
    if r == "viewer":
        return ROLE_VIEWER
    if r == "client":
        return ROLE_CLIENT
    return None


def _extract_admin_role_from_token(request) -> str | None:
    """Return the canonical admin role from the admin JWT cookie, or None."""
    admin_token = get_admin_request_token(request)
    if not admin_token:
        return None
    payload = load_admin_login_token(admin_token)
    if payload is None:
        return None
    raw_role = payload.get("role")
    return _canonical_admin_role(raw_role)


def _extract_role_from_request(request) -> str | None:
    """Return the canonical role for the current request, checking all sources."""
    # 1. Role attached directly to the request object by middleware
    for attr in ("auth_user", "client_user", "admin_user", "user"):
        user = getattr(request, attr, None)
        if user is None:
            continue
        if getattr(user, "is_superuser", False):
            return ROLE_SUPERADMIN
        if getattr(user, "is_staff", False):
            return ROLE_ADMIN
        role_value = getattr(user, "role", None)
        canonical = _canonical_admin_role(role_value)
        if canonical:
            return canonical
        if getattr(user, "is_authenticated", False) and attr == "client_user":
            return ROLE_CLIENT

    # 2. Admin JWT cookie / Authorization header
    admin_role = _extract_admin_role_from_token(request)
    if admin_role:
        return admin_role

    # 3. Client JWT cookie / Authorization header (fallback)
    token = get_client_request_token(request)
    if token:
        payload = load_client_login_token(token)
        if payload is not None:
            return ROLE_CLIENT

    return None


def get_request_role(request) -> str | None:
    """Public helper: return the canonical role for the current request."""
    return _extract_role_from_request(request)


def role_has_min_weight(role: str | None, min_role: str) -> bool:
    """Return True if *role* has at least the same privilege level as *min_role*."""
    return _ROLE_WEIGHT.get(role or "", -1) >= _ROLE_WEIGHT.get(min_role, 0)


# ---------------------------------------------------------------------------
# Permission classes
# ---------------------------------------------------------------------------

class BaseRolePermission:
    """Base permission helper for role-based request checks."""

    allowed_roles: tuple[str, ...] = ()
    denied_message = "Permission denied"

    def has_permission(self, request, view=None) -> bool:
        role = _extract_role_from_request(request)
        return role in self.allowed_roles

    def denied_response(self):
        return JsonResponse(
            {
                "status": "error",
                "message": self.denied_message,
                "required_roles": list(self.allowed_roles),
            },
            status=403,
        )


class IsClient(BaseRolePermission):
    """Allow access to authenticated client requests."""

    allowed_roles = (ROLE_CLIENT,)
    denied_message = "Client access required"


class IsAdmin(BaseRolePermission):
    """Allow access to any admin role (Admin, SuperAdmin, or Viewer)."""

    allowed_roles = (ROLE_ADMIN, ROLE_SUPERADMIN, ROLE_VIEWER)
    denied_message = "Admin access required"


class IsAdminOrSuperAdmin(BaseRolePermission):
    """Allow access to Admin and SuperAdmin roles only (not Viewer)."""

    allowed_roles = (ROLE_ADMIN, ROLE_SUPERADMIN)
    denied_message = "Admin or SuperAdmin access required"


class IsSuperAdmin(BaseRolePermission):
    """Allow access only to SuperAdmin role."""

    allowed_roles = (ROLE_SUPERADMIN,)
    denied_message = "SuperAdmin access required"


class IsViewer(BaseRolePermission):
    """Allow access only to Viewer role (read-only admins)."""

    allowed_roles = (ROLE_VIEWER,)
    denied_message = "Viewer access required"


# ---------------------------------------------------------------------------
# Decorator factory
# ---------------------------------------------------------------------------

def permission_required(permission_cls: type[BaseRolePermission]):
    """Wrap a sync or async Django view with a role permission check."""

    def decorator(view_func: Callable):
        permission = permission_cls()

        if iscoroutinefunction(view_func):

            @wraps(view_func)
            async def async_wrapped(request, *args, **kwargs):
                await ensure_db_initialized()
                if not permission.has_permission(request, view_func):
                    return permission.denied_response()
                return await view_func(request, *args, **kwargs)

            return async_wrapped

        @wraps(view_func)
        def sync_wrapped(request, *args, **kwargs):
            async_to_sync(ensure_db_initialized)()
            if not permission.has_permission(request, view_func):
                return permission.denied_response()
            return view_func(request, *args, **kwargs)

        return sync_wrapped

    return decorator


def require_role(*roles: str):
    """Decorator: allow access only if the request role is one of *roles*.

    Accepts canonical lowercase role names or the class constants, e.g.::

        @require_role(ROLE_SUPERADMIN)
        async def delete_admin_user(request, user_id): ...

        @require_role(ROLE_ADMIN, ROLE_SUPERADMIN)
        async def create_admin_user(request): ...
    """
    allowed = frozenset(r.lower() for r in roles)
    denied_message = f"Access restricted to: {', '.join(sorted(allowed))}"

    def decorator(view_func: Callable):
        if iscoroutinefunction(view_func):

            @wraps(view_func)
            async def async_wrapped(request, *args, **kwargs):
                await ensure_db_initialized()
                role = _extract_role_from_request(request)
                if role not in allowed:
                    return JsonResponse(
                        {"status": "error", "message": denied_message, "required_roles": list(allowed)},
                        status=403,
                    )
                return await view_func(request, *args, **kwargs)

            return async_wrapped

        @wraps(view_func)
        def sync_wrapped(request, *args, **kwargs):
            async_to_sync(ensure_db_initialized)()
            role = _extract_role_from_request(request)
            if role not in allowed:
                return JsonResponse(
                    {"status": "error", "message": denied_message, "required_roles": list(allowed)},
                    status=403,
                )
            return view_func(request, *args, **kwargs)

        return sync_wrapped

    return decorator
