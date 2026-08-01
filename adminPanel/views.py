"""Plain async view functions for adminPanel — no router decorators."""

import json
import random
import string

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from adminPanel.models import (
    ActivityLog,
    AdminUser,
    ClientUser,
    Investor,
    Manager,
    PendingRequest,
)
from adminPanel.view.mam_accounts import create_mam_account

# ── GET views ──────────────────────────────────────────────────────────────────

async def list_admin_system_users(request):
    """List system admin users directly from database."""
    admin_users = await AdminUser.all()
    results = [
        {
            "id": f"ADM-{user.id:03d}",
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "department": user.department,
            "permissions": user.permissions or [],
            "status": user.status,
            "lastLogin": user.last_login.strftime("%Y-%m-%d %H:%M:%S") if user.last_login else None,
            "avatar": user.avatar,
        }
        for user in admin_users
    ]
    return JsonResponse({"status": "ok", "admin_users": results})


async def list_client_users(request):
    """List client users directly from database."""
    client_users = await ClientUser.all()
    results = [
        {
            "id": user.user_code or f"USR-{user.id:03d}",
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "status": user.status,
            "verified": user.verified,
            "country": user.country,
            "joined": user.joined.strftime("%Y-%m-%d") if user.joined else None,
            "avatar": user.avatar,
            "tradingAccount": None,
            "bankCrypto": None,
            "transactions": [],
            "tickets": [],
        }
        for user in client_users
    ]
    return JsonResponse({"status": "ok", "users": results})


async def list_pending_requests(request):
    """List pending admin requests directly from database."""
    requests = await PendingRequest.all()
    results = [
        {
            "id": r.id,
            "type": r.request_type,
            "client": r.client_name,
            "amount": r.amount,
            "status": r.status,
        }
        for r in requests
    ]
    return JsonResponse({"status": "ok", "requests": results})


async def list_managers(request):
    """List MAM managers directly from database."""
    managers = await Manager.all()
    results = [
        {
            "id": m.id,
            "name": m.name,
            "email": m.email,
            "strategy": m.strategy,
            "aum": m.total_aum,
            "performance_fee": f"{m.performance_fee}%",
            "status": m.status,
        }
        for m in managers
    ]
    return JsonResponse({"status": "ok", "managers": results})


async def list_investors(request):
    """List investors directly from database."""
    investors = await Investor.all()
    results = [
        {
            "id": i.id,
            "name": i.name,
            "email": i.email,
            "equity": i.equity,
            "allocated_mam": i.allocated_mam,
            "status": i.status,
        }
        for i in investors
    ]
    return JsonResponse({"status": "ok", "investors": results})


async def list_activity_logs(request):
    """List system activity logs directly from database."""
    logs = await ActivityLog.all().order_by("-created_at")
    results = [
        {
            "id": log.id,
            "action": log.action,
            "user": log.user_email,
            "ip_address": log.ip_address,
            "time": log.created_at.strftime("%Y-%m-%d %H:%M:%S") if log.created_at else None,
        }
        for log in logs
    ]
    return JsonResponse({"status": "ok", "activities": results})


from clientPanel.view.common import hash_client_password

# ── POST views ─────────────────────────────────────────────────────────────────

def _generate_user_code(prefix: str, length: int = 6) -> str:
    """Generate a random user code like USR-A83F2C."""
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=length))
    return f"{prefix}-{suffix}"


@csrf_exempt
@require_http_methods(["POST"])
async def create_admin_user(request):
    """Create a new system admin user."""
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"status": "error", "message": "Invalid JSON body"}, status=400)

    name = body.get("name", "").strip()
    email = body.get("email", "").strip()
    role = body.get("role", "admin").strip()
    department = body.get("department", "Operations").strip()
    permissions = body.get("permissions", [])
    password = body.get("password", "").strip()
    avatar = body.get(
        "avatar",
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80",
    )

    if not name or not email:
        return JsonResponse({"status": "error", "message": "name and email are required"}, status=400)

    if await AdminUser.filter(email=email).exists():
        return JsonResponse(
            {"status": "error", "message": "An admin user with this email already exists"},
            status=409,
        )

    password_hash = hash_client_password(password) if password else None

    user = await AdminUser.create(
        name=name,
        email=email,
        role=role,
        department=department,
        permissions=permissions,
        status="Active",
        avatar=avatar,
        password_hash=password_hash,
    )

    return JsonResponse(
        {
            "status": "ok",
            "message": f"Admin user '{name}' created successfully",
            "admin_user": {
                "id": f"ADM-{user.id:03d}",
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "department": user.department,
                "permissions": user.permissions or [],
                "status": user.status,
                "lastLogin": None,
                "avatar": user.avatar,
            },
        },
        status=201,
    )


@csrf_exempt
@require_http_methods(["POST"])
async def create_client_user(request):
    """Create a new client user."""
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"status": "error", "message": "Invalid JSON body"}, status=400)

    name = body.get("name", "").strip()
    email = body.get("email", "").strip()
    phone = body.get("phone", "").strip()
    role = body.get("role", "Client User").strip()
    country = body.get("country", "United States").strip()
    password = body.get("password", "").strip()
    avatar = body.get(
        "avatar",
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80",
    )

    if not name or not email:
        return JsonResponse({"status": "error", "message": "name and email are required"}, status=400)

    if await ClientUser.filter(email=email).exists():
        return JsonResponse(
            {"status": "error", "message": "A client user with this email already exists"},
            status=409,
        )

    user_code = _generate_user_code("USR")
    while await ClientUser.filter(user_code=user_code).exists():
        user_code = _generate_user_code("USR")

    password_hash = hash_client_password(password) if password else None

    user = await ClientUser.create(
        user_code=user_code,
        name=name,
        email=email,
        phone=phone or None,
        role=role,
        country=country,
        status="Active",
        verified=False,
        avatar=avatar,
        password_hash=password_hash,
    )

    return JsonResponse(
        {
            "status": "ok",
            "message": f"Client user '{name}' created successfully",
            "user": {
                "id": user.user_code,
                "name": user.name,
                "email": user.email,
                "phone": user.phone,
                "role": user.role,
                "status": user.status,
                "verified": user.verified,
                "country": user.country,
                "joined": user.joined.strftime("%Y-%m-%d") if user.joined else None,
                "avatar": user.avatar,
                "tradingAccount": None,
                "bankCrypto": None,
                "transactions": [],
                "tickets": [],
            },
        },
        status=201,
    )
