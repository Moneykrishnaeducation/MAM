"""Reusable permission helpers for admin and client request handlers."""

from __future__ import annotations

from collections.abc import Callable
from functools import wraps
from inspect import iscoroutinefunction
from typing import Any

from django.http import JsonResponse

from clientPanel.view.common import load_client_login_token


def _normalize_role(value: Any) -> str | None:
    if value is None:
        return None
    role = str(value).strip()
    if not role:
        return None
    return role.lower()


def _extract_role_from_request(request) -> str | None:
    for attr in ("auth_user", "client_user", "admin_user", "user"):
        user = getattr(request, attr, None)
        if user is None:
            continue
        if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
            return "admin"
        role = _normalize_role(getattr(user, "role", None))
        if role:
            return role
        if getattr(user, "is_authenticated", False):
            if attr == "client_user":
                return "client"

    headers = getattr(request, "headers", {}) or {}
    authorization = headers.get("Authorization") or headers.get("authorization")
    if authorization:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() == "bearer" and token.strip():
            payload = load_client_login_token(token.strip())
            if payload is not None:
                return "client"

    return None


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

    allowed_roles = ("client",)
    denied_message = "Client access required"


class IsAdmin(BaseRolePermission):
    """Allow access to authenticated admin requests."""

    allowed_roles = ("admin",)
    denied_message = "Admin access required"


def permission_required(permission_cls: type[BaseRolePermission]):
    """Wrap a sync or async Django view with a role permission check."""

    def decorator(view_func: Callable):
        permission = permission_cls()

        if iscoroutinefunction(view_func):

            @wraps(view_func)
            async def async_wrapped(request, *args, **kwargs):
                if not permission.has_permission(request, view_func):
                    return permission.denied_response()
                return await view_func(request, *args, **kwargs)

            return async_wrapped

        @wraps(view_func)
        def sync_wrapped(request, *args, **kwargs):
            if not permission.has_permission(request, view_func):
                return permission.denied_response()
            return view_func(request, *args, **kwargs)

        return sync_wrapped

    return decorator
