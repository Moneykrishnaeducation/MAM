"""Notification API views using Django views and Tortoise ORM."""

from __future__ import annotations

import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from adminPanel.models import ClientUser, Notification, TradingAccount
from backendPanel.database import ensure_db_initialized
from clientPanel.view.common import (
    _error,
    _resolve_client_user_id,
    get_admin_request_token,
    load_admin_login_token,
)


async def _get_user_for_request(request) -> tuple[ClientUser | None, JsonResponse | None]:
    """Helper to get the authenticated user from request (either client or admin)."""
    # 1. Resolve client session
    client_user_id = await _resolve_client_user_id(request)
    if client_user_id:
        user = await ClientUser.filter(id=client_user_id).first()
        if user:
            return user, None

    # 2. Resolve admin session
    admin_token = get_admin_request_token(request)
    if admin_token:
        payload = load_admin_login_token(admin_token)
        if payload:
            user_id = payload.get("user_id")
            if user_id:
                user = await ClientUser.filter(id=int(user_id)).first()
                if user:
                    return user, None

    return None, _error("Authentication required", status=401)


@csrf_exempt
@require_http_methods(["GET"])
async def get_notifications(request):
    """Get all notifications for the authenticated user."""
    await ensure_db_initialized()
    user, error = await _get_user_for_request(request)
    if error:
        return error

    # Get query parameters
    notification_type = request.GET.get("type", None)
    notification_status = request.GET.get("status", None)
    unread_only = request.GET.get("unread_only", "false").lower() == "true"
    limit_raw = request.GET.get("limit", "50")
    try:
        limit = int(limit_raw)
    except ValueError:
        limit = 50

    # Build query
    queryset = Notification.filter(user_id=user.id)

    # Manager restriction logic: restrict to manager's clients if manager
    user_role = str(user.role or "").strip().lower()
    user_status = getattr(user, "manager_admin_status", None)
    is_manager = (
        user_role == "manager" or (user_status and "Manager" in str(user_status))
    ) and not getattr(user, "is_superuser", False)

    if is_manager:
        try:
            client_user_ids = await ClientUser.filter(role="Client").values_list("id", flat=True)

            account_ids = await TradingAccount.filter(user_id__in=client_user_ids).values_list(
                "account_id", flat=True
            )

            if not account_ids:
                queryset = Notification.none()
            else:
                from tortoise.expressions import Q

                queryset = queryset.filter(
                    Q(metadata__account_id__in=account_ids)
                    | Q(
                        related_object_type__iexact="TradingAccount",
                        related_object_id__in=[int(a) for a in account_ids if str(a).isdigit()],
                    )
                )
        except Exception:
            queryset = Notification.none()

    if notification_type and notification_type != "all":
        queryset = queryset.filter(notification_type=notification_type)

    if notification_status and notification_status != "all":
        queryset = queryset.filter(status=notification_status)

    if unread_only:
        queryset = queryset.filter(is_read=False)

    # Order by newest
    queryset = queryset.order_by("-created_at")

    # Get total and unread counts before slice/limit
    total_count = await queryset.count()
    unread_count = await queryset.filter(is_read=False).count()

    notifications = await queryset.limit(limit)

    notification_data = []
    for notif in notifications:
        notification_data.append(
            {
                "id": notif.id,
                "notification_type": notif.notification_type,
                "status": notif.status,
                "title": notif.title,
                "message": notif.message,
                "action_url": notif.action_url,
                "is_read": notif.is_read,
                "read_at": notif.read_at.isoformat() if notif.read_at else None,
                "created_at": notif.created_at.isoformat() if notif.created_at else None,
                "metadata": notif.metadata,
            }
        )

    return JsonResponse(
        {
            "success": True,
            "notifications": notification_data,
            "unread_count": unread_count,
            "total_count": total_count,
        }
    )


@csrf_exempt
@require_http_methods(["POST"])
async def mark_notification_read(request, notification_id):
    """Mark a specific notification as read."""
    await ensure_db_initialized()
    user, error = await _get_user_for_request(request)
    if error:
        return error

    notification = await Notification.filter(id=notification_id, user_id=user.id).first()
    if not notification:
        return _error("Notification not found", status=404)

    await notification.mark_as_read()
    unread_count = await Notification.get_unread_count(user)

    return JsonResponse(
        {"success": True, "message": "Notification marked as read", "unread_count": unread_count}
    )


@csrf_exempt
@require_http_methods(["POST"])
async def mark_all_notifications_read(request):
    """Mark all notifications as read for the authenticated user."""
    await ensure_db_initialized()
    user, error = await _get_user_for_request(request)
    if error:
        return error

    await Notification.mark_all_read(user)

    return JsonResponse(
        {"success": True, "message": "All notifications marked as read", "unread_count": 0}
    )


@csrf_exempt
@require_http_methods(["DELETE", "POST"])
async def delete_notification(request, notification_id):
    """Delete a specific notification."""
    await ensure_db_initialized()
    user, error = await _get_user_for_request(request)
    if error:
        return error

    notification = await Notification.filter(id=notification_id, user_id=user.id).first()
    if not notification:
        return _error("Notification not found", status=404)

    await notification.delete()
    unread_count = await Notification.get_unread_count(user)

    return JsonResponse(
        {"success": True, "message": "Notification deleted", "unread_count": unread_count}
    )


@csrf_exempt
@require_http_methods(["GET"])
async def get_unread_count(request):
    """Get count of unread notifications for the authenticated user."""
    await ensure_db_initialized()
    user, error = await _get_user_for_request(request)
    if error:
        return error

    unread_count = await Notification.get_unread_count(user)

    return JsonResponse({"success": True, "unread_count": unread_count})


@csrf_exempt
@require_http_methods(["POST"])
async def create_notification(request):
    """Create a new notification (admin/manager only or system-triggered)."""
    await ensure_db_initialized()
    user, error = await _get_user_for_request(request)
    if error:
        return error

    try:
        body = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, ValueError):
        return _error("Invalid JSON body", status=400)

    notification_type = body.get("notification_type")
    status_value = body.get("status", "created")
    title = body.get("title")
    message = body.get("message")
    action_url = body.get("action_url", None)
    target_user_id = body.get("target_user_id", None)

    if not all([notification_type, title, message]):
        return _error("Missing required fields: notification_type, title, message", status=400)

    is_admin = str(user.role or "").strip().lower() in ("admin", "superadmin")
    if target_user_id and is_admin:
        target_user = await ClientUser.filter(id=int(target_user_id)).first()
        if not target_user:
            return _error("Target user not found", status=404)
    else:
        target_user = user

    notification = await Notification.create_notification(
        user=target_user,
        notification_type=notification_type,
        status=status_value,
        title=title,
        message=message,
        action_url=action_url,
        metadata=body.get("metadata", {}),
    )

    return JsonResponse(
        {
            "success": True,
            "message": "Notification created successfully",
            "notification_id": notification.id,
        },
        status=201,
    )
