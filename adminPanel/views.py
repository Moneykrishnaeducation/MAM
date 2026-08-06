"""Plain async view functions for adminPanel — no router decorators."""

import base64
import json
import logging
import random
import re
import secrets
import string
from pathlib import Path

from django.conf import settings
from django.core.files.storage import default_storage
from django.http import JsonResponse
from django.template.loader import render_to_string
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from tortoise import Tortoise

from backendPanel.mail_queue import queue_email_message
from adminPanel.models import (
    ActivityLog,
    AdminUser,
    ClientDocument,
    ClientProfile,
    ClientUser,
    PendingRequest,
    TradingAccount,
)
from adminPanel.mt5.services import MT5ManagerActions
from backendPanel.permissions import IsAdmin, permission_required
from clientPanel.crud import create_client_profile
from clientPanel.view.common import (
    _mask_account_number,
    _serialize_client_profile,
    build_document_details_payload,
    get_admin_request_token,
    get_client_document_details,
    get_client_payment_details,
    get_latest_document_request,
    hash_client_password,
    load_admin_login_token,
    serialize_client_document_detail,
)
from backendPanel.database import ensure_db_initialized

AVATAR_FILENAME_RE = re.compile(r"^data:image/(?P<ext>png|jpeg|jpg|gif|webp);base64,")
logger = logging.getLogger(__name__)

CLIENT_LOGIN_URL = f"{getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:3000').rstrip('/')}/client/login"


def _generate_temporary_password(length: int = 12) -> str:
    """Generate a strong temporary password for new client accounts."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    while True:
        candidate = "".join(secrets.choice(alphabet) for _ in range(length))
        if (
            any(ch.islower() for ch in candidate)
            and any(ch.isupper() for ch in candidate)
            and any(ch.isdigit() for ch in candidate)
            and any(ch in "!@#$%^&*" for ch in candidate)
        ):
            return candidate


def _save_avatar_data(avatar_base64: str, admin_id: int) -> str | None:
    """Save base64 image data to media/avatars and return the public media path."""
    match = AVATAR_FILENAME_RE.match(avatar_base64)
    if not match:
        return None

    ext = match.group("ext")
    avatar_data = avatar_base64.split(",", 1)[-1]
    try:
        decoded = base64.b64decode(avatar_data)
    except (TypeError, ValueError):
        return None

    avatar_dir = Path(settings.MEDIA_ROOT) / "avatars"
    avatar_dir.mkdir(parents=True, exist_ok=True)
    filename = f"admin-avatar-{admin_id}.{ext}"
    file_path = avatar_dir / filename

    with open(file_path, "wb") as f:
        f.write(decoded)

    return f"{settings.MEDIA_URL.rstrip('/')}/avatars/{filename}"


def _save_uploaded_document(uploaded_file, user_id: int, document_type: str) -> tuple[str, str]:
    original_name = Path(getattr(uploaded_file, "name", "") or "document").name
    relative_path = f"client_documents/{user_id}/{document_type}/{original_name}"
    saved_path = default_storage.save(relative_path, uploaded_file)
    file_url = default_storage.url(saved_path)
    return saved_path, file_url


def _render_client_welcome_email(
    *,
    user_name: str,
    email: str,
    user_code: str,
    phone: str | None,
    country: str,
    temporary_password: str | None,
) -> tuple[str, str, str]:
    context = {
        "title": "Welcome to VT Index",
        "user_name": user_name or "there",
        "email": email,
        "user_code": user_code,
        "phone": phone or "",
        "country": country or "",
        "temporary_password": temporary_password or "",
        "login_url": CLIENT_LOGIN_URL,
    }
    subject = "Welcome to VT Index"
    plain_body = render_to_string("emails/client_welcome_email.txt", context).strip()
    html_body = render_to_string("emails/client_welcome_email.html", context)
    return subject, plain_body, html_body


async def _send_client_welcome_email(
    *,
    user: ClientUser,
    temporary_password: str | None,
) -> None:
    subject, plain_body, html_body = _render_client_welcome_email(
        user_name=user.name or user.email or "there",
        email=user.email,
        user_code=user.user_code or f"USR-{user.id:03d}",
        phone=user.phone,
        country=user.country or "United States",
        temporary_password=temporary_password,
    )
    await queue_email_message(
        subject=subject,
        body=plain_body,
        html_body=html_body,
        to=[user.email],
        source="client_user_creation",
        payload={
            "user_code": user.user_code,
            "email": user.email,
            "login_url": CLIENT_LOGIN_URL,
        },
    )


# Valid roles for AdminUser records (canonical title-case)
_VALID_ADMIN_ROLES: frozenset[str] = frozenset({"Admin", "SuperAdmin", "Viewer"})

_ROLE_CANONICAL: dict[str, str] = {
    "admin": "Admin",
    "superadmin": "SuperAdmin",
    "super_admin": "SuperAdmin",
    "super admin": "SuperAdmin",
    "viewer": "Viewer",
}


def _canonicalize_admin_role(raw: str) -> str | None:
    """Return canonical title-case role or None if not a valid admin role."""
    return _ROLE_CANONICAL.get(raw.strip().lower().replace("-", "").replace(" ", ""))


async def _get_current_admin_user(request):
    token = get_admin_request_token(request)
    if not token:
        return None, JsonResponse(
            {"status": "error", "message": "Authentication token missing."}, status=401
        )

    payload = load_admin_login_token(token)
    if payload is None:
        return None, JsonResponse(
            {"status": "error", "message": "Invalid or expired admin token."}, status=401
        )

    user_id = payload.get("user_id")
    if user_id is None:
        return None, JsonResponse(
            {"status": "error", "message": "Invalid admin token payload."}, status=401
        )

    user = await AdminUser.filter(id=int(user_id)).first()
    if user is None:
        return None, JsonResponse(
            {"status": "error", "message": "Admin user not found."}, status=404
        )

    return user, None


async def _resolve_client_user(user_id: str) -> ClientUser | None:
    """Resolve a client user by either `USR-...` code or numeric id."""
    lookup = str(user_id or "").strip()
    if not lookup:
        return None

    user = await ClientUser.filter(user_code=lookup).first()
    if user is not None:
        return user

    if lookup.upper().startswith("USR-"):
        suffix = lookup.split("-", 1)[1]
        if suffix.isdigit():
            return await ClientUser.filter(id=int(suffix)).first()

    if lookup.isdigit():
        return await ClientUser.filter(id=int(lookup)).first()

    return None


async def _build_client_kyc_payload(user: ClientUser) -> dict:
    """Load the stored KYC/profile document data for a client user."""
    document_detail = await get_client_document_details(user)
    identity_request = await get_latest_document_request(user, "identity")
    address_request = await get_latest_document_request(user, "address")

    kyc_documents = build_document_details_payload(
        profile=user,
        document_detail=document_detail,
        identity_request=identity_request,
        address_request=address_request,
    )

    return {
        "user": {
            "user_id": user.id,
            "id": user.user_code or f"USR-{user.id:03d}",
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "country": user.country,
            "avatar": user.avatar,
            "status": user.status,
            "verified": user.verified,
            "joined": user.joined.strftime("%Y-%m-%d") if user.joined else None,
        },
        "profile": _serialize_client_profile(user),
        "document_detail": serialize_client_document_detail(document_detail),
        "documents": kyc_documents,
        "kyc_status": user.kyc_status,
        "document_status": {
            "identity": kyc_documents["identity"]["status"],
            "address": kyc_documents["address"]["status"],
        },
    }


async def _load_or_create_client_document(user: ClientUser) -> ClientDocument:
    document = await ClientDocument.filter(user_id=user.id).first()
    if document is not None:
        return document

    legacy_profile = await ClientProfile.filter(user_id=user.id).first()
    if legacy_profile is not None:
        conn = Tortoise.get_connection("default")
        rows = await conn.execute_query_dict(
            "SELECT id FROM client_documents WHERE client_profile_id = $1 LIMIT 1",
            [legacy_profile.id],
        )
        if rows:
            document_id = rows[0].get("id")
            if document_id is not None:
                await conn.execute_query(
                    "UPDATE client_documents SET user_id = $1 WHERE id = $2",
                    [user.id, document_id],
                )
                existing = await ClientDocument.filter(id=document_id).first()
                if existing is not None:
                    return existing

    return await ClientDocument.create(user_id=user.id)


# ── GET views ──────────────────────────────────────────────────────────────────


@csrf_exempt
@permission_required(IsAdmin)
@require_http_methods(["GET"])
async def list_admin_system_users(request):
    """List system admin users from the admin_users table."""
    await ensure_db_initialized()
    admin_users = await AdminUser.all().order_by("-created_at")
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
            "created_at": user.created_at.strftime("%Y-%m-%d %H:%M:%S")
            if user.created_at
            else None,
        }
        for user in admin_users
    ]
    return JsonResponse({"status": "ok", "admin_users": results})


@csrf_exempt
@permission_required(IsAdmin)
@require_http_methods(["GET", "PUT"])
async def admin_profile(request):
    """Get or update the currently authenticated admin user's profile."""
    await ensure_db_initialized()
    user, error_response = await _get_current_admin_user(request)
    if error_response is not None:
        return error_response

    if request.method == "GET":
        return JsonResponse(
            {
                "status": "ok",
                "admin_user": {
                    "id": f"ADM-{user.id:03d}",
                    "name": user.name,
                    "email": user.email,
                    "role": user.role,
                    "department": user.department,
                    "permissions": user.permissions or [],
                    "status": user.status,
                    "avatar": user.avatar,
                    "lastLogin": user.last_login.strftime("%Y-%m-%d %H:%M:%S")
                    if user.last_login
                    else None,
                },
            }
        )

    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"status": "error", "message": "Invalid JSON body"}, status=400)

    if "name" in body:
        user.name = body["name"]
    if "department" in body:
        user.department = body["department"]
    if "permissions" in body:
        user.permissions = body["permissions"]
    if "status" in body:
        user.status = body["status"]
    if "avatar" in body:
        avatar_value = body["avatar"]
        if isinstance(avatar_value, str) and avatar_value.startswith("data:image/"):
            saved_path = _save_avatar_data(avatar_value, user.id)
            if saved_path:
                user.avatar = saved_path
        else:
            user.avatar = avatar_value
    if "password" in body and body["password"]:
        user.password_hash = hash_client_password(body["password"])

    await user.save()
    return JsonResponse(
        {
            "status": "ok",
            "message": "Administrator profile updated successfully",
            "admin_user": {
                "id": f"ADM-{user.id:03d}",
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "department": user.department,
                "permissions": user.permissions or [],
                "status": user.status,
                "avatar": user.avatar,
                "lastLogin": user.last_login.strftime("%Y-%m-%d %H:%M:%S")
                if user.last_login
                else None,
            },
        }
    )


@csrf_exempt
@permission_required(IsAdmin)
@require_http_methods(["GET"])
async def list_client_users(request):
    """List client users directly from database."""
    await ensure_db_initialized()
    client_users = await ClientUser.all()
    results = []
    for user in client_users:
        bank_detail = None
        crypto_detail = None
        bank_detail, crypto_detail = await get_client_payment_details(user)
        document_detail = await get_client_document_details(user)
        identity_request = await get_latest_document_request(user, "identity")
        address_request = await get_latest_document_request(user, "address")

        # Fetch associated TradingAccount entries
        t_accs = await TradingAccount.filter(user_id=user.id)
        trading_accounts_data = [
            {
                "accNumber": acc.account_id,
                "accountRole": "manager" if acc.account_type.upper() == "MAM" else "investor",
                "type": acc.account_type,
                "balance": float(acc.balance),
                "equity": float(acc.equity),
                "leverage": f"{acc.leverage}x",
                "server": "VTIndex-Live01",
                "currency": "USD",
                "marginFree": float(acc.margin_free),
                "activeTrades": 0,
                "status": acc.status or "Active",
                "agent": getattr(settings, "MT5_DEFAULT_AGENT", 426)
                if acc.account_type.upper() == "MAM"
                else None,
            }
            for acc in t_accs
        ]

        # Primary trading account (for backward compatibility / default view)
        primary_acc = trading_accounts_data[0] if trading_accounts_data else None

        bank_account_number = bank_detail.account_number if bank_detail else ""
        crypto_wallet_address = crypto_detail.wallet_address if crypto_detail else ""
        crypto_network = crypto_detail.network if crypto_detail else "USDT-TRC20"
        payment_details = {
            "paymentType": "bank" if bank_detail else ("crypto" if crypto_detail else "bank"),
            "accountHolder": bank_detail.account_holder
            if bank_detail and bank_detail.account_holder
            else user.name,
            "accountNumber": bank_account_number,
            "bankName": bank_detail.bank_name if bank_detail else "",
            "ifscSwift": bank_detail.ifsc_swift if bank_detail else "",
            "branch": bank_detail.branch if bank_detail and bank_detail.branch else "",
            "country": bank_detail.country if bank_detail and bank_detail.country else user.country,
            "bankStatus": bank_detail.status if bank_detail else "pending",
            "network": crypto_network,
            "cryptoAddress": crypto_wallet_address,
            "cryptoCurrency": crypto_detail.currency if crypto_detail else "USDT",
            "cryptoStatus": crypto_detail.status if crypto_detail else "pending",
        }

        bank_crypto = {
            "accountMask": _mask_account_number(bank_account_number)
            if bank_account_number
            else "Not Configured",
            "bankName": bank_detail.bank_name if bank_detail else "Not Configured",
            "cryptoWallet": f"{crypto_wallet_address} ({crypto_network})".strip()
            if crypto_wallet_address
            else "Not Configured",
        }

        results.append(
            {
                "id": user.user_code or f"USR-{user.id:03d}",
                "user_id": user.id,
                "name": user.name,
                "email": user.email,
                "phone": user.phone,
                "role": user.role,
                "status": user.status,
                "verified": user.verified,
                "country": user.country,
                "joined": user.joined.strftime("%Y-%m-%d") if user.joined else None,
                "avatar": user.avatar,
                "tradingAccount": primary_acc,
                "tradingAccounts": trading_accounts_data,
                "profile": _serialize_client_profile(user),
                "kyc": {
                    "status": user.kyc_status,
                    "document_detail": serialize_client_document_detail(document_detail),
                    "documents": build_document_details_payload(
                        profile=user,
                        document_detail=document_detail,
                        identity_request=identity_request,
                        address_request=address_request,
                    ),
                },
                "paymentDetails": payment_details,
                "bankCrypto": bank_crypto,
                "transactions": [],
                "tickets": [],
            }
        )
    return JsonResponse({"status": "ok", "users": results})


@csrf_exempt
@permission_required(IsAdmin)
@require_http_methods(["GET", "PUT"])
async def get_client_user_kyc(request, user_id: str):
    """Return the KYC profile and documents for an admin users-page row."""
    await ensure_db_initialized()
    user = await _resolve_client_user(user_id)
    if user is None:
        return JsonResponse({"status": "error", "message": "Client user not found"}, status=404)

    if request.method == "PUT":
        try:
            body = json.loads(request.body or b"{}")
        except (json.JSONDecodeError, ValueError):
            return JsonResponse({"status": "error", "message": "Invalid JSON body"}, status=400)

        verified = body.get("verified")
        if verified is not None:
            user.verified = bool(verified)

        kyc_status = body.get("kyc_status") or body.get("status")
        if kyc_status is not None:
            user.kyc_status = str(kyc_status).strip() or user.kyc_status
        elif verified is not None:
            user.kyc_status = "Verified" if user.verified else "Pending"

        await user.save(update_fields=["verified", "kyc_status", "updated_at"])
        payload = await _build_client_kyc_payload(user)
        return JsonResponse({"status": "ok", "message": "KYC status updated", **payload})

    payload = await _build_client_kyc_payload(user)
    return JsonResponse({"status": "ok", **payload})


@csrf_exempt
@permission_required(IsAdmin)
@require_http_methods(["PUT", "POST"])
async def update_client_user_documents(request, user_id: str):
    """Update a client's identity/address document details from the admin modal."""
    await ensure_db_initialized()
    user = await _resolve_client_user(user_id)
    if user is None:
        return JsonResponse({"status": "error", "message": "Client user not found"}, status=404)

    document = await _load_or_create_client_document(user)

    payload: dict = {}
    if request.content_type and request.content_type.startswith("multipart/form-data"):
        raw_documents = request.POST.get("documents") or request.POST.get("payload") or "[]"
        try:
            docs = json.loads(raw_documents)
        except (json.JSONDecodeError, ValueError):
            docs = []
        if isinstance(docs, dict):
            docs = [docs]
        if not isinstance(docs, list):
            docs = []
        payload = {"documents": docs}
    else:
        try:
            payload = json.loads(request.body or b"{}")
        except (json.JSONDecodeError, ValueError):
            payload = {}

    documents = payload.get("documents") if isinstance(payload, dict) else []
    if not isinstance(documents, list):
        documents = []

    slot_map = {
        "id_proof": (
            "identity_file_name",
            "identity_file_path",
            "identity_status",
            "identity_uploaded_at",
        ),
        "address_proof": (
            "address_file_name",
            "address_file_path",
            "address_status",
            "address_uploaded_at",
        ),
    }
    file_map = {
        "id_proof": request.FILES.get("id_proof")
        or request.FILES.get("identity")
        or request.FILES.get("identityFile"),
        "address_proof": request.FILES.get("address_proof")
        or request.FILES.get("address")
        or request.FILES.get("addressFile"),
    }

    updated_slots: list[str] = []
    for item in documents:
        if not isinstance(item, dict):
            continue
        doc_type = str(item.get("type") or "").strip().lower()
        if doc_type not in slot_map:
            continue

        file_field_name, file_path_field, status_field, uploaded_at_field = slot_map[doc_type]
        status = str(item.get("status") or "pending").strip().lower()
        if status not in {"pending", "approved", "rejected", "uploaded"}:
            status = "pending"
        if status == "uploaded":
            status = "pending"

        uploaded_file = file_map.get(doc_type)
        if uploaded_file is not None:
            file_name, file_path = _save_uploaded_document(
                uploaded_file, user.id, "identity" if doc_type == "id_proof" else "address"
            )
            setattr(document, file_field_name, file_name)
            setattr(document, file_path_field, file_path)
            setattr(document, uploaded_at_field, timezone.now())
        elif item.get("fileUrl") or item.get("file_url"):
            file_path_value = str(item.get("fileUrl") or item.get("file_url") or "").strip() or None
            file_name_value = (
                str(item.get("fileName") or item.get("file_name") or "").strip() or None
            )
            if file_name_value:
                setattr(document, file_field_name, file_name_value)
            if file_path_value:
                setattr(document, file_path_field, file_path_value)

        setattr(document, status_field, status)
        updated_slots.append(doc_type)

    await document.save()

    identity_status = str(document.identity_status or "pending").strip().lower()
    address_status = str(document.address_status or "pending").strip().lower()
    if identity_status == "approved" and address_status == "approved":
        user.verified = True
        user.kyc_status = "Verified"
    elif identity_status == "rejected" or address_status == "rejected":
        user.verified = False
        user.kyc_status = "Rejected"
    else:
        user.verified = False
        user.kyc_status = "Pending"
    await user.save(update_fields=["verified", "kyc_status", "updated_at"])

    return JsonResponse(
        {
            "status": "ok",
            "message": "Client documents updated successfully",
            "updated_slots": updated_slots,
            "kyc": await _build_client_kyc_payload(user),
        }
    )


@csrf_exempt
@permission_required(IsAdmin)
@require_http_methods(["PUT", "POST"])
async def update_client_user_status(request, user_id: str):
    """Update a client's active/inactive status from the admin users modal."""
    await ensure_db_initialized()
    user = await _resolve_client_user(user_id)
    if user is None:
        return JsonResponse({"status": "error", "message": "Client user not found"}, status=404)

    try:
        body = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, ValueError):
        body = {}

    raw_status = str(body.get("status") or "").strip()
    raw_active = body.get("active")

    if raw_status:
        normalized = raw_status.lower()
        if normalized in {"active", "enabled", "enable"}:
            user.status = "Active"
        elif normalized in {"inactive", "suspended", "disable", "disabled"}:
            user.status = "Inactive"
        else:
            return JsonResponse({"status": "error", "message": "Invalid status value"}, status=400)
    elif raw_active is not None:
        user.status = "Active" if bool(raw_active) else "Inactive"
    else:
        user.status = "Inactive" if str(user.status or "").strip().lower() == "active" else "Active"

    await user.save(update_fields=["status", "updated_at"])

    return JsonResponse(
        {
            "status": "ok",
            "message": "Client status updated successfully",
            "user": {
                "user_id": user.id,
                "id": user.user_code or f"USR-{user.id:03d}",
                "name": user.name,
                "email": user.email,
                "phone": user.phone,
                "country": user.country,
                "avatar": user.avatar,
                "status": user.status,
                "verified": user.verified,
                "joined": user.joined.strftime("%Y-%m-%d") if user.joined else None,
            },
        }
    )


async def list_pending_requests(request):
    """List pending admin requests directly from database."""
    await ensure_db_initialized()
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
    """List MAM managers directly from database with optional search and pagination."""
    await ensure_db_initialized()
    raw_page = request.GET.get("page")
    raw_per_page = request.GET.get("per_page") or request.GET.get("limit")
    search_q = str(request.GET.get("search") or request.GET.get("q") or "").strip().lower()

    paginate = raw_page is not None or raw_per_page is not None

    def _parse_positive_int(val, default):
        try:
            parsed = int(str(val).strip())
            return max(1, parsed)
        except (ValueError, TypeError):
            return default

    page = _parse_positive_int(raw_page, 1)
    per_page = _parse_positive_int(raw_per_page, 10)

    managers = await TradingAccount.filter(account_type="MAM").prefetch_related("user").all()
    results = []

    for m in managers:
        name = m.account_name or (m.user.name if m.user else "MAM Manager")
        email = m.user.email if m.user else "manager@mam.com"
        acc_id = m.account_id or ""

        if search_q:
            haystack = f"{name} {email} {acc_id}".lower()
            if search_q not in haystack:
                continue

        balance_value = float(m.balance or 0.0)
        equity_value = float(m.equity or 0.0)
        credit_value = float(m.credit or 0.0)

        try:
            mt5 = MT5ManagerActions()
            account_data = mt5.get_account_data(acc_id, use_cache=True) if acc_id else None
            if account_data:
                balance_value = float(account_data.get("balance", balance_value))
                equity_value = float(account_data.get("equity", equity_value))
        except Exception as exc:
            logger.warning("MT5 manager lookup failed for %s: %s", acc_id, exc)

        results.append(
            {
                "id": m.id,
                "account_id": acc_id,
                "name": name,
                "email": email,
                "strategy": m.risk_level or "Quantitative Grid",
                "aum": balance_value,
                "balance": balance_value,
                "credit": credit_value,
                "equity": equity_value,
                "performance_fee": f"{m.profit_sharing_percentage or 20.0}%",
                "status": m.status or "Active",
            }
        )

    total = len(results)

    if paginate:
        total_pages = max(1, (total + per_page - 1) // per_page)
        page = min(page, total_pages)
        start_index = (page - 1) * per_page
        end_index = start_index + per_page
        paginated_results = results[start_index:end_index]

        response = {
            "status": "ok",
            "managers": paginated_results,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_previous": page > 1,
            },
        }
    else:
        response = {
            "status": "ok",
            "managers": results,
        }

    return JsonResponse(response)


async def list_investors(request):
    """List investors directly from database."""
    await ensure_db_initialized()
    investors = await TradingAccount.filter(account_type="Investor").prefetch_related("user")
    results = []
    for i in investors:
        # `mam_master_account` is an async relation in Tortoise — await it to get the related object.
        try:
            mam_master = await i.mam_master_account
        except Exception:
            mam_master = None

        results.append(
            {
                "id": i.id,
                "account_id": i.account_id,
                "name": i.user.name if i.user else "Investor User",
                "email": i.user.email if i.user else "investor@mam.com",
                "equity": float(i.equity),
                "allocated_mam_name": mam_master.account_name if mam_master else None,
                "allocated_mam": mam_master.account_id if mam_master else None,
                "status": i.status or "Active",
            }
        )

    return JsonResponse({"status": "ok", "investors": results})


def _classify_activity_log(log: ActivityLog) -> str:
    """Infer an activity category from the audit columns."""
    text = f"{log.user_role} {log.action_type} {log.module_name}".lower()
    role = str(log.user_role or "").strip().lower()

    if any(
        keyword in text
        for keyword in (
            "error",
            "failed",
            "failure",
            "exception",
            "denied",
            "blocked",
            "unauthorized",
            "invalid",
        )
    ):
        return "error"

    if role == "client":
        return "client"

    if role in {"admin", "superadmin", "viewer"}:
        return "admin"

    if any(
        keyword in text
        for keyword in (
            "client",
            "user",
            "login",
            "signin",
            "sign in",
            "profile",
            "account",
            "kyc",
            "ticket",
            "deposit",
            "withdraw",
            "payment",
        )
    ):
        return "client"

    return "admin"


def _format_activity_details(log: ActivityLog) -> str:
    """Build a compact readable description for UI cards and tables."""
    parts: list[str] = [log.module_name]
    if log.record_id:
        parts.append(f"Record {log.record_id}")
    if log.action_type:
        parts.append(log.action_type)
    return " · ".join(part for part in parts if part)


def _serialize_activity_log(log: ActivityLog) -> dict:
    """Serialize a single activity log row for activity APIs."""
    return {
        "id": log.id,
        "user_name": log.user_name,
        "user_role": log.user_role,
        "action_type": log.action_type,
        "module_name": log.module_name,
        "record_id": log.record_id,
        "old_values": log.old_values,
        "new_values": log.new_values,
        "ip_address": log.ip_address,
        "user_agent": log.user_agent,
        "timestamp": log.timestamp.strftime("%Y-%m-%d %H:%M:%S") if log.timestamp else None,
        "user_id": log.user_id,
        "action": log.action_type,
        "user": log.user_name,
        "details": _format_activity_details(log),
        "time": log.timestamp.strftime("%Y-%m-%d %H:%M:%S") if log.timestamp else None,
        "category": _classify_activity_log(log),
    }


async def _list_activity_logs_by_category(category: str | None = None):
    """Return serialized activity logs filtered by category when requested."""
    await ensure_db_initialized()
    logs = await ActivityLog.all().order_by("-timestamp")
    results = [_serialize_activity_log(log) for log in logs]

    if category and category != "all":
        results = [log for log in results if log["category"] == category]

    return JsonResponse({"status": "ok", "activities": results})


async def list_activity_logs(request):
    """List system activity logs directly from database."""
    return await _list_activity_logs_by_category("all")


async def list_admin_activity_logs(request):
    """List admin-category activity logs directly from database."""
    return await _list_activity_logs_by_category("admin")


async def list_client_activity_logs(request):
    """List client-category activity logs directly from database."""
    return await _list_activity_logs_by_category("client")


async def list_error_activity_logs(request):
    """List error-category activity logs directly from database."""
    return await _list_activity_logs_by_category("error")


# ── POST views ─────────────────────────────────────────────────────────────────


def _generate_user_code(prefix: str, length: int = 6) -> str:
    """Generate a random user code like USR-A83F2C."""
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=length))
    return f"{prefix}-{suffix}"


@csrf_exempt
@require_http_methods(["POST"])
async def create_admin_user(request):
    """Create a new system admin user in the admin_users table.

    Required fields: name, email, password, role (Admin | SuperAdmin | Viewer).
    """
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"status": "error", "message": "Invalid JSON body"}, status=400)

    await ensure_db_initialized()

    name = body.get("name", "").strip()
    email = body.get("email", "").strip().lower()
    role_input = body.get("role", "Admin").strip()
    role = _canonicalize_admin_role(role_input)
    department = body.get("department", "Operations").strip()
    permissions = body.get("permissions", [])
    password = body.get("password", "").strip()
    avatar = body.get(
        "avatar",
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80",
    )

    if not name or not email:
        return JsonResponse(
            {"status": "error", "message": "name and email are required"}, status=400
        )

    if not password:
        return JsonResponse(
            {"status": "error", "message": "password is required for admin users"}, status=400
        )

    if role is None:
        return JsonResponse(
            {
                "status": "error",
                "message": f"Invalid role '{role_input}'. Must be one of: Admin, SuperAdmin, Viewer.",
            },
            status=400,
        )

    if await AdminUser.filter(email=email).exists():
        return JsonResponse(
            {"status": "error", "message": "An admin user with this email already exists"},
            status=409,
        )

    password_hash = hash_client_password(password)

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

    await ensure_db_initialized()

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
        return JsonResponse(
            {"status": "error", "message": "name and email are required"}, status=400
        )

    if role.lower() == "admin":
        return JsonResponse(
            {
                "status": "error",
                "message": "Admin users must be created through the admin user endpoint",
            },
            status=400,
        )

    if await ClientUser.filter(email=email).exists():
        return JsonResponse(
            {"status": "error", "message": "A client user with this email already exists"},
            status=409,
        )

    user_code = _generate_user_code("USR")
    while await ClientUser.filter(user_code=user_code).exists():
        user_code = _generate_user_code("USR")

    temporary_password = password or _generate_temporary_password()
    password_hash = hash_client_password(temporary_password)

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

    await create_client_profile(
        user.id,
        user.name,
        user.email,
        phone=phone or None,
        country=country,
    )

    try:
        await _send_client_welcome_email(user=user, temporary_password=temporary_password)
    except Exception as exc:
        logger.error(f"Failed to send client welcome email to {user.email}: {exc}")

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
                "temporaryPassword": temporary_password,
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
        await ensure_db_initialized()
        user = await _resolve_client_user(user_id)
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
        await ensure_db_initialized()
        from adminPanel.models import MT5GroupConfig, TradeGroup

        is_demo_request = "demo" in request.path.lower()
        configs = await MT5GroupConfig.filter(is_demo=is_demo_request)

        groups_list = []
        for c in configs:
            groups_list.append(
                {
                    "id": c.group_name,
                    "label": c.group_name,
                    "enabled": c.is_enabled,
                    "alias": c.description or "",
                    "is_default": False,
                    "is_demo_default": False,
                    "is_demo": c.is_demo,
                }
            )

        trade_groups = await TradeGroup.all()
        for tg in trade_groups:
            for g in groups_list:
                if g["id"] == tg.name:
                    g["is_default"] = tg.is_default
                    g["is_demo_default"] = tg.is_demo_default
                    g["alias"] = tg.alias or g["alias"]

        return JsonResponse({"success": True, "groups": groups_list})
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=500)


@csrf_exempt
@require_http_methods(["GET"])
async def get_current_group_config(request):
    """Get the current MT5 group default/alias configuration."""
    try:
        await ensure_db_initialized()
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

            group_item = {"id": c.group_name, "name": c.group_name, "alias": alias}

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

        return JsonResponse(
            {
                "success": True,
                "configuration": {
                    "real_groups": real_groups,
                    "demo_groups": demo_groups,
                    "default_group": default_group,
                    "demo_group": demo_group,
                    "last_updated": None,
                },
            }
        )
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
async def save_group_configuration(request):
    """Save the real group configurations and set defaults."""
    try:
        await ensure_db_initialized()
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
                    type="real",
                )

        return JsonResponse({"success": True})
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
async def save_demo_group_configuration(request):
    """Save the demo group configurations and set defaults."""
    try:
        await ensure_db_initialized()
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
            is_demo_default = (
                (group_name == demo_default_id) if demo_default_id else g.get("demo_default", False)
            )

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
                    type="demo",
                )

        return JsonResponse({"success": True, "demo_default_group": demo_default_id})
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=500)


@csrf_exempt
@permission_required(IsAdmin)
@require_http_methods(["PUT", "POST"])
async def update_admin_user(request, user_id):
    """Update an administrator's profile, role, or password (targets admin_users table)."""
    try:
        await ensure_db_initialized()
        body = json.loads(request.body)

        clean_id = user_id
        if "ADM-" in str(user_id):
            try:
                clean_id = int(str(user_id).split("-")[-1])
            except ValueError:
                pass

        user = await AdminUser.filter(id=clean_id).first()
        if not user:
            return JsonResponse(
                {"status": "error", "message": "Administrator not found"}, status=404
            )

        if "role" in body:
            new_role_input = str(body["role"]).strip()
            new_role = _canonicalize_admin_role(new_role_input)
            if new_role is None:
                return JsonResponse(
                    {
                        "status": "error",
                        "message": f"Invalid role '{new_role_input}'. Must be one of: Admin, SuperAdmin, Viewer.",
                    },
                    status=400,
                )
            user.role = new_role
        if "name" in body:
            user.name = body["name"]
        if "department" in body:
            user.department = body["department"]
        if "status" in body:
            user.status = body["status"]
        if "permissions" in body:
            user.permissions = body["permissions"]
        if "avatar" in body:
            user.avatar = body["avatar"]
        if "password" in body and body["password"]:
            user.password_hash = hash_client_password(body["password"])

        await user.save()
        return JsonResponse(
            {
                "status": "ok",
                "message": "Administrator updated successfully",
                "admin_user": {
                    "id": f"ADM-{user.id:03d}",
                    "name": user.name,
                    "email": user.email,
                    "role": user.role,
                    "department": user.department,
                    "permissions": user.permissions or [],
                    "status": user.status,
                    "avatar": user.avatar,
                },
            }
        )
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)
