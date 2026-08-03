"""Plain async view functions for adminPanel — no router decorators."""

import json
import random
import string

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from adminPanel.models import (
    ActivityLog,
    ClientUser,
    Investor,
    Manager,
    PendingRequest,
)
from backendPanel.permissions import IsAdmin, permission_required
from clientPanel.view.common import hash_client_password

# ── GET views ──────────────────────────────────────────────────────────────────

async def list_admin_system_users(request):
    """List system admin users directly from database."""
    admin_users = await ClientUser.filter(role__iexact="admin").order_by("-created_at")
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
            "created_at": user.created_at.strftime("%Y-%m-%d %H:%M:%S") if user.created_at else None,
        }
        for user in admin_users
    ]
    return JsonResponse({"status": "ok", "admin_users": results})


async def list_client_users(request):
    """List client users directly from database."""
    client_users = await ClientUser.exclude(role__iexact="admin").order_by("-joined")
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

    if await ClientUser.filter(email=email).exists():
        return JsonResponse(
            {"status": "error", "message": "An admin user with this email already exists"},
            status=409,
        )

    password_hash = hash_client_password(password) if password else None

    user = await ClientUser.create(
        name=name,
        email=email,
        role=role,
        department=department,
        permissions=permissions,
        status="Active",
        avatar=avatar,
        password_hash=password_hash,
        verified=True,
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
    role = body.get("role", "Client").strip()
    country = body.get("country", "United States").strip()
    password = body.get("password", "").strip()
    avatar = body.get(
        "avatar",
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80",
    )

    if not name or not email:
        return JsonResponse({"status": "error", "message": "name and email are required"}, status=400)

    if role.lower() == "admin":
        return JsonResponse({"status": "error", "message": "Admin users must be created through the admin user endpoint"}, status=400)

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
        role="Client",
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


@csrf_exempt
@permission_required(IsAdmin)
@require_http_methods(["DELETE"])
async def delete_user(request, user_id):
    """Delete a user from the system."""
    try:
        clean_id = user_id
        if "ADM-" in user_id or "USR-" in user_id:
            try:
                clean_id = int(user_id.split("-")[-1])
            except ValueError:
                pass
        
        user = await ClientUser.filter(id=clean_id).first()
        if not user:
            return JsonResponse({"status": "error", "message": "User not found"}, status=404)
        
        await user.delete()
        return JsonResponse({"status": "ok", "message": "User deleted successfully"})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)


@csrf_exempt
@require_http_methods(["GET"])
async def get_available_groups(request):
    """Retrieve available groups from mt5_group_config table."""
    try:
        from adminPanel.models import MT5GroupConfig, TradeGroup
        
        is_demo_request = "demo" in request.path.lower()
        configs = await MT5GroupConfig.filter(is_demo=is_demo_request)
        
        groups_list = []
        for c in configs:
            groups_list.append({
                "id": c.group_name,
                "label": c.group_name,
                "enabled": c.is_enabled,
                "alias": c.description or "",
                "is_default": False,
                "is_demo_default": False,
                "is_demo": c.is_demo,
            })
            
        trade_groups = await TradeGroup.all()
        for tg in trade_groups:
            for g in groups_list:
                if g["id"] == tg.name:
                    g["is_default"] = tg.is_default
                    g["is_demo_default"] = tg.is_demo_default
                    g["alias"] = tg.alias or g["alias"]
                    
        return JsonResponse({
            "success": True,
            "groups": groups_list
        })
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=500)


@csrf_exempt
@require_http_methods(["GET"])
async def get_current_group_config(request):
    """Get the current MT5 group default/alias configuration."""
    try:
        from adminPanel.models import MT5GroupConfig, TradeGroup
        
        configs = await MT5GroupConfig.all()
        trade_groups = await TradeGroup.all()
        
        real_groups = []
        demo_groups = []
        default_group = None
        demo_group = None
        
        # Build map of trade groups for quick lookup
        tg_map = {tg.name: tg for tg in trade_groups}
        
        for c in configs:
            tg = tg_map.get(c.group_name)
            alias = tg.alias if tg else (c.description or "")
            
            group_item = {
                "id": c.group_name,
                "name": c.group_name,
                "alias": alias
            }
            
            if c.is_demo:
                demo_groups.append(group_item)
                if tg and tg.is_demo_default:
                    demo_group = {"id": c.group_name}
            else:
                real_groups.append(group_item)
                if tg and tg.is_default:
                    default_group = {"id": c.group_name}
                    
        # Fallbacks if default is not set
        if not default_group and real_groups:
            default_group = {"id": real_groups[0]["id"]}
        if not demo_group and demo_groups:
            demo_group = {"id": demo_groups[0]["id"]}
            
        return JsonResponse({
            "success": True,
            "configuration": {
                "real_groups": real_groups,
                "demo_groups": demo_groups,
                "default_group": default_group,
                "demo_group": demo_group,
                "last_updated": None
            }
        })
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
async def save_group_configuration(request):
    """Save the real group configurations and set defaults."""
    try:
        from adminPanel.models import MT5GroupConfig, TradeGroup
        body = json.loads(request.body)
        groups_input = body.get("groups", [])
        
        # Determine default group id
        default_id = None
        for g in groups_input:
            if g.get("default") is True:
                default_id = g.get("id")
                break
                
        # Clear previous defaults
        if default_id:
            await TradeGroup.filter(type="real").update(is_default=False)
            
        for g in groups_input:
            group_name = g.get("id")
            enabled = g.get("enabled", True)
            alias = g.get("alias", "")
            is_default = (group_name == default_id) if default_id else g.get("default", False)
            
            # Update/Create MT5GroupConfig
            config = await MT5GroupConfig.filter(group_name=group_name).first()
            if config:
                config.is_enabled = enabled
                config.description = alias
                await config.save()
                
            # Update/Create TradeGroup
            tg = await TradeGroup.filter(name=group_name).first()
            if tg:
                tg.alias = alias
                tg.is_active = enabled
                tg.is_default = is_default
                await tg.save()
            else:
                await TradeGroup.create(
                    name=group_name,
                    alias=alias,
                    is_active=enabled,
                    is_default=is_default,
                    type="real"
                )
                
        return JsonResponse({"success": True})
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
async def save_demo_group_configuration(request):
    """Save the demo group configurations and set defaults."""
    try:
        from adminPanel.models import MT5GroupConfig, TradeGroup
        body = json.loads(request.body)
        groups_input = body.get("groups", [])
        
        # Determine default group id
        demo_default_id = None
        for g in groups_input:
            if g.get("demo_default") is True:
                demo_default_id = g.get("id")
                break
                
        # Clear previous defaults
        if demo_default_id:
            await TradeGroup.filter(type="demo").update(is_demo_default=False)
            
        for g in groups_input:
            group_name = g.get("id")
            enabled = g.get("enabled", True)
            alias = g.get("alias", "")
            is_demo_default = (group_name == demo_default_id) if demo_default_id else g.get("demo_default", False)
            
            # Update/Create MT5GroupConfig
            config = await MT5GroupConfig.filter(group_name=group_name).first()
            if config:
                config.is_enabled = enabled
                config.description = alias
                await config.save()
                
            # Update/Create TradeGroup
            tg = await TradeGroup.filter(name=group_name).first()
            if tg:
                tg.alias = alias
                tg.is_active = enabled
                tg.is_demo_default = is_demo_default
                await tg.save()
            else:
                await TradeGroup.create(
                    name=group_name,
                    alias=alias,
                    is_active=enabled,
                    is_demo_default=is_demo_default,
                    type="demo"
                )
                
        return JsonResponse({"success": True, "demo_default_group": demo_default_id})
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=500)


@csrf_exempt
@require_http_methods(["PUT", "POST"])
async def update_admin_user(request, user_id):
    """Update an administrator's profile or password."""
    try:
        body = json.loads(request.body)
        
        clean_id = user_id
        if "ADM-" in user_id or "USR-" in user_id:
            try:
                clean_id = int(user_id.split("-")[-1])
            except ValueError:
                pass
                
        user = await ClientUser.filter(id=clean_id).first()
        if not user:
            return JsonResponse({"status": "error", "message": "Administrator not found"}, status=404)
            
        if "role" in body:
            user.role = body["role"]
        if "name" in body:
            user.name = body["name"]
        if "phone" in body:
            user.phone = body["phone"]
        if "address" in body:
            user.address = body["address"]
        if "password" in body and body["password"]:
            user.password_hash = hash_client_password(body["password"])
            
        await user.save()
        return JsonResponse({"status": "ok", "message": "Administrator updated successfully"})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

