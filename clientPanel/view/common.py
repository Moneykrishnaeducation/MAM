"""Shared helpers for clientPanel view modules."""

import base64
import hashlib
import hmac
import json
import os
import time

from django.http import JsonResponse
from django.utils import timezone
from tortoise import Tortoise

from adminPanel.models import (
    ClientBankDetail,
    ClientCryptoDetail,
    ClientDocument,
    ClientProfile,
    ClientUser,
    PendingRequest,
)
from backendPanel.database import ensure_db_initialized

CLIENT_LOGIN_KEY = "client-panel-login-key"
CLIENT_LOGIN_COOKIE_NAME = "client_auth_token"
AUTH_ACCESS_COOKIE_NAME = "access_token"
AUTH_JWT_COOKIE_NAME = "jwt_token"
AUTH_REFRESH_COOKIE_NAME = "refresh_token"
AUTH_ROLE_COOKIE_NAME = "role"
AUTH_USER_ID_COOKIE_NAME = "user_id"
CLIENT_LOGIN_MAX_AGE = 60 * 60 * 24 * 7
CLIENT_PASSWORD_HASH_ITERATIONS = 120000
ADMIN_LOGIN_KEY = "admin-panel-login-key"
ADMIN_LOGIN_COOKIE_NAME = "admin_auth_token"
ADMIN_LOGIN_MAX_AGE = 60 * 60 * 24 * 7


def _error(message: str, status: int = 400, **extra):
    payload = {"status": "error", "message": message}
    payload.update(extra)
    return JsonResponse(payload, status=status)


def _owner_user_id(owner: ClientProfile | ClientUser) -> int:
    return int(getattr(owner, "user_id", None) or getattr(owner, "id"))


def _serialize_client_profile(profile: ClientProfile | ClientUser) -> dict:
    return {
        "user_id": getattr(profile, "user_id", None) or getattr(profile, "id", None),
        "full_name": getattr(profile, "full_name", None) or getattr(profile, "name", None),
        "email": getattr(profile, "email", None),
        "phone": getattr(profile, "phone", None),
        "country": getattr(profile, "country", None),
        "dateOfBirth": getattr(profile, "date_of_birth", None),
        "address": getattr(profile, "address", None),
        "city": getattr(profile, "city", None),
        "postalCode": getattr(profile, "postal_code", None),
        "tier": getattr(profile, "tier", None),
        "kyc_status": getattr(profile, "kyc_status", None),
        "avatar": getattr(profile, "avatar", None),
    }


def _extract_bearer_token(request) -> str | None:
    authorization = request.headers.get("Authorization") or request.headers.get("authorization")
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        return None
    return token.strip()


def _get_first_cookie(request, cookie_names: tuple[str, ...]) -> str | None:
    cookies = getattr(request, "COOKIES", {})
    for cookie_name in cookie_names:
        token = cookies.get(cookie_name)
        if token:
            return token
    return None


def get_client_request_token(request) -> str | None:
    """Read the client session token from the HttpOnly cookie or Authorization header."""
    token = _get_first_cookie(
        request,
        (
            CLIENT_LOGIN_COOKIE_NAME,
            AUTH_ACCESS_COOKIE_NAME,
            AUTH_JWT_COOKIE_NAME,
            AUTH_REFRESH_COOKIE_NAME,
        ),
    )
    if token:
        return token
    return _extract_bearer_token(request)


def get_admin_request_token(request) -> str | None:
    """Read the admin session token from the HttpOnly cookie or Authorization header."""
    token = _get_first_cookie(
        request,
        (
            ADMIN_LOGIN_COOKIE_NAME,
            AUTH_ACCESS_COOKIE_NAME,
            AUTH_JWT_COOKIE_NAME,
            AUTH_REFRESH_COOKIE_NAME,
        ),
    )
    if token:
        return token
    return _extract_bearer_token(request)


def set_auth_cookies(
    response,
    *,
    token: str,
    user_id: int,
    role: str,
    max_age: int,
    secure: bool,
    legacy_cookie_name: str,
):
    """Persist auth token and role in browser cookies."""
    cookie_options = {
        "max_age": max_age,
        "secure": secure,
        "samesite": "Lax",
        "path": "/",
    }
    http_only_options = {**cookie_options, "httponly": True}

    response.set_cookie(legacy_cookie_name, token, **http_only_options)
    response.set_cookie(AUTH_ACCESS_COOKIE_NAME, token, **http_only_options)
    response.set_cookie(AUTH_JWT_COOKIE_NAME, token, **http_only_options)
    response.set_cookie(AUTH_REFRESH_COOKIE_NAME, token, **http_only_options)
    response.set_cookie(AUTH_USER_ID_COOKIE_NAME, str(user_id), **cookie_options)
    response.set_cookie(AUTH_ROLE_COOKIE_NAME, role, **cookie_options)
    return response


def _normalize_payment_status(status: str | None, default: str = "pending") -> str:
    value = str(status or default).strip().lower()
    if value in {"approved", "pending"}:
        return value
    return default


def _normalize_review_status(status: str | None, default: str = "pending") -> str:
    value = str(status or default).strip().lower()
    if value in {"approved", "pending", "rejected"}:
        return value
    return default


def _mask_account_number(account_number: str | None) -> str:
    value = "".join(ch for ch in str(account_number or "").strip() if ch.isalnum())
    if not value:
        return ""
    if len(value) <= 4:
        return value
    return f"****{value[-4:]}"


def serialize_client_bank_detail(detail: ClientBankDetail | None) -> dict | None:
    if detail is None:
        return None
    return {
        "id": detail.id,
        "account_holder": detail.account_holder,
        "bank_name": detail.bank_name,
        "account_number": detail.account_number,
        "ifsc_swift": detail.ifsc_swift,
        "branch": detail.branch,
        "country": detail.country,
        "status": _normalize_payment_status(detail.status),
        "created_at": detail.created_at.strftime("%Y-%m-%d %H:%M:%S")
        if detail.created_at
        else None,
        "updated_at": detail.updated_at.strftime("%Y-%m-%d %H:%M:%S")
        if detail.updated_at
        else None,
    }


def serialize_client_crypto_detail(detail: ClientCryptoDetail | None) -> dict | None:
    if detail is None:
        return None
    return {
        "id": detail.id,
        "network": detail.network,
        "wallet_address": detail.wallet_address,
        "currency": detail.currency,
        "status": _normalize_payment_status(detail.status),
        "created_at": detail.created_at.strftime("%Y-%m-%d %H:%M:%S")
        if detail.created_at
        else None,
        "updated_at": detail.updated_at.strftime("%Y-%m-%d %H:%M:%S")
        if detail.updated_at
        else None,
    }


def serialize_client_document_detail(detail: ClientDocument | None) -> dict | None:
    if detail is None:
        return None
    return {
        "id": detail.id,
        "identity": {
            "file_name": detail.identity_file_name,
            "file_path": detail.identity_file_path,
            "status": _normalize_review_status(detail.identity_status),
            "uploaded_at": detail.identity_uploaded_at.strftime("%Y-%m-%d %H:%M:%S")
            if detail.identity_uploaded_at
            else None,
        },
        "address": {
            "file_name": detail.address_file_name,
            "file_path": detail.address_file_path,
            "status": _normalize_review_status(detail.address_status),
            "uploaded_at": detail.address_uploaded_at.strftime("%Y-%m-%d %H:%M:%S")
            if detail.address_uploaded_at
            else None,
        },
        "created_at": detail.created_at.strftime("%Y-%m-%d %H:%M:%S")
        if detail.created_at
        else None,
        "updated_at": detail.updated_at.strftime("%Y-%m-%d %H:%M:%S")
        if detail.updated_at
        else None,
    }


async def get_client_payment_details(
    owner: ClientProfile | ClientUser,
) -> tuple[ClientBankDetail | None, ClientCryptoDetail | None]:
    await ensure_db_initialized()
    user_id = _owner_user_id(owner)
    bank_detail = await ClientBankDetail.filter(user_id=user_id).first()
    crypto_detail = await ClientCryptoDetail.filter(user_id=user_id).first()
    return bank_detail, crypto_detail


async def get_client_document_details(owner: ClientProfile | ClientUser) -> ClientDocument | None:
    await ensure_db_initialized()
    user_id = _owner_user_id(owner)
    document = await ClientDocument.filter(user_id=user_id).first()
    if document is not None:
        return document

    legacy_profile = await ClientProfile.filter(user_id=user_id).first()
    if legacy_profile is None:
        return None

    conn = Tortoise.get_connection("default")
    rows = await conn.execute_query_dict(
        """
        SELECT id
        FROM client_documents
        WHERE client_profile_id = $1
        LIMIT 1
        """,
        [legacy_profile.id],
    )
    if not rows:
        return None

    legacy_id = rows[0].get("id")
    if legacy_id is None:
        return None

    return await ClientDocument.filter(id=legacy_id).first()


async def get_latest_payment_request_status(
    owner: ClientProfile | ClientUser, payment_type: str
) -> str | None:
    await ensure_db_initialized()
    normalized_type = _normalize_payment_request_type(payment_type)
    if normalized_type is None:
        return None

    request = (
        await PendingRequest.filter(
            user_id=_owner_user_id(owner),
            request_type=normalized_type,
        )
        .order_by("-created_at")
        .first()
    )
    if request is None:
        return None
    return _normalize_review_status(request.status)


async def get_latest_profile_request_status(owner: ClientProfile | ClientUser) -> str | None:
    await ensure_db_initialized()
    request = (
        await PendingRequest.filter(
            user_id=_owner_user_id(owner),
            request_type__icontains="profile",
        )
        .order_by("-created_at")
        .first()
    )
    if request is None:
        return None
    return _normalize_review_status(request.status)


async def get_latest_document_request_status(
    owner: ClientProfile | ClientUser, document_type: str
) -> str | None:
    await ensure_db_initialized()
    normalized_type = str(document_type or "").strip().lower()
    if normalized_type not in {"identity", "address"}:
        return None

    request = await get_latest_document_request(owner, normalized_type)
    if request is None:
        return None
    return _normalize_review_status(request.status)


async def get_latest_document_request(
    owner: ClientProfile | ClientUser, document_type: str
) -> PendingRequest | None:
    await ensure_db_initialized()
    normalized_type = str(document_type or "").strip().lower()
    if normalized_type not in {"identity", "address"}:
        return None

    requests = await PendingRequest.filter(
        user_id=_owner_user_id(owner),
        request_type__icontains="document",
    ).order_by("-created_at")
    for request in requests:
        payload = request.payload if isinstance(request.payload, dict) else {}
        if (
            str(payload.get("document_type") or payload.get("documentType") or "").strip().lower()
            == normalized_type
        ):
            return request
    return None


def _normalize_payment_request_type(value: str | None) -> str | None:
    request_type = str(value or "").strip().lower()
    if request_type in {"bank", "crypto"}:
        return request_type
    return None


def build_payment_submission_payload(
    *,
    profile: ClientProfile,
    payment_type: str,
    body: dict,
    bank_detail: ClientBankDetail | None = None,
    crypto_detail: ClientCryptoDetail | None = None,
) -> dict:
    request_type = _normalize_payment_request_type(payment_type)
    if request_type is None:
        raise ValueError("paymentType must be either 'bank' or 'crypto'")

    if request_type == "bank":
        existing_bank_name = bank_detail.bank_name if bank_detail else ""
        existing_account_number = bank_detail.account_number if bank_detail else ""
        existing_ifsc = bank_detail.ifsc_swift if bank_detail else ""
        existing_branch = bank_detail.branch if bank_detail else ""
        existing_status = bank_detail.status if bank_detail else None
        return {
            "paymentType": "bank",
            "account_holder": str(
                body.get("accountHolder") or body.get("account_holder") or profile.full_name
            ).strip()
            or profile.full_name,
            "bank_name": str(
                body.get("bankName") or body.get("bank_name") or existing_bank_name
            ).strip(),
            "account_number": str(
                body.get("accountNumber") or body.get("account_number") or existing_account_number
            ).strip(),
            "ifsc_swift": str(
                body.get("ifscSwift") or body.get("ifsc_swift") or existing_ifsc
            ).strip(),
            "branch": str(body.get("branch") or existing_branch).strip() or None,
            "country": str(body.get("country") or profile.country).strip() or profile.country,
            "status": _normalize_payment_status(
                body.get("bankStatus") or body.get("status") or existing_status
            ),
        }

    existing_network = crypto_detail.network if crypto_detail else "USDT-TRC20"
    existing_wallet = crypto_detail.wallet_address if crypto_detail else ""
    existing_currency = crypto_detail.currency if crypto_detail else "USDT"
    existing_status = crypto_detail.status if crypto_detail else None
    return {
        "paymentType": "crypto",
        "network": str(body.get("network") or existing_network).strip() or "USDT-TRC20",
        "wallet_address": str(
            body.get("cryptoAddress")
            or body.get("walletAddress")
            or body.get("wallet_address")
            or existing_wallet
        ).strip(),
        "currency": str(
            body.get("cryptoCurrency") or body.get("currency") or existing_currency
        ).strip()
        or "USDT",
        "status": _normalize_payment_status(
            body.get("cryptoStatus") or body.get("status") or existing_status
        ),
    }


def build_profile_submission_payload(
    *, body: dict, user: ClientUser, profile: ClientProfile | None = None
) -> dict:
    current_profile = profile
    current_full_name = current_profile.full_name if current_profile else user.name
    current_phone = current_profile.phone if current_profile else user.phone
    current_country = current_profile.country if current_profile else user.country
    current_date_of_birth = current_profile.date_of_birth if current_profile else None
    current_address = current_profile.address if current_profile else None
    current_city = current_profile.city if current_profile else None
    current_postal_code = current_profile.postal_code if current_profile else None
    current_tier = current_profile.tier if current_profile else "VIP Premium"
    current_kyc_status = current_profile.kyc_status if current_profile else "Verified"

    email = str(body.get("email") or user.email).strip().lower()
    if email and email != user.email.lower():
        raise ValueError("Client email cannot be changed")

    return {
        "full_name": str(body.get("name") or current_full_name).strip() or current_full_name,
        "email": user.email,
        "phone": str(body.get("phone") or current_phone or "").strip() or None,
        "country": str(body.get("country") or current_country).strip() or current_country,
        "date_of_birth": str(body.get("dateOfBirth") or current_date_of_birth or "").strip()
        or None,
        "address": str(body.get("address") or current_address or "").strip() or None,
        "city": str(body.get("city") or current_city or "").strip() or None,
        "postal_code": str(body.get("postalCode") or current_postal_code or "").strip() or None,
        "tier": str(body.get("tier") or current_tier).strip() or current_tier,
        "kyc_status": str(body.get("kycStatus") or current_kyc_status).strip()
        or current_kyc_status,
        "avatar": str(body.get("avatar") or user.avatar or "").strip() or None,
        "user_id": user.id,
        "user_code": user.user_code,
    }


def build_document_submission_payload(
    *,
    profile: ClientProfile | ClientUser,
    body: dict,
    file_name: str,
    file_path: str,
    file_url: str | None = None,
    content_type: str | None = None,
    file_size: int | None = None,
) -> dict:
    document_type = str(body.get("documentType") or body.get("document_type") or "").strip().lower()
    if document_type not in {"identity", "address"}:
        raise ValueError("documentType must be either 'identity' or 'address'")

    return {
        "document_type": document_type,
        "file_name": file_name,
        "file_path": file_path,
        "file_url": file_url,
        "content_type": content_type,
        "file_size": file_size,
        "client_profile_id": getattr(profile, "id", None),
        "user_id": _owner_user_id(profile),
        "client_name": getattr(profile, "full_name", None) or getattr(profile, "name", None),
        "client_email": profile.email,
        "status": "pending",
    }


async def create_payment_pending_request(
    profile: ClientProfile | ClientUser, payload: dict
) -> PendingRequest:
    await ensure_db_initialized()
    payment_type = _normalize_payment_request_type(
        payload.get("paymentType") or payload.get("payment_type")
    )
    if payment_type is None:
        raise ValueError("paymentType must be either 'bank' or 'crypto'")

    payload = {
        **payload,
        "client_profile_id": getattr(profile, "id", None),
        "user_id": _owner_user_id(profile),
        "client_name": getattr(profile, "full_name", None) or getattr(profile, "name", None),
        "client_email": profile.email,
    }

    pending_request = await PendingRequest.create(
        request_type=payment_type,
        client_name=getattr(profile, "full_name", None) or getattr(profile, "name", None),
        user_id=_owner_user_id(profile),
        amount=0.0,
        status="Pending",
        payload=payload,
    )
    return pending_request


async def create_profile_pending_request(
    profile: ClientProfile | ClientUser, user: ClientUser, payload: dict
) -> PendingRequest:
    await ensure_db_initialized()
    submission_payload = {
        **payload,
        "user_id": user.id,
        "user_code": user.user_code,
        "client_profile_id": getattr(profile, "id", None),
        "client_name": payload.get("full_name") or payload.get("name") or user.name,
        "client_email": user.email,
    }
    pending_request = await PendingRequest.create(
        request_type="profile",
        client_name=str(submission_payload.get("client_name") or user.name).strip() or user.name,
        user_id=user.id,
        amount=0.0,
        status="Pending",
        payload=submission_payload,
    )
    return pending_request


async def create_document_pending_request(
    profile: ClientProfile | ClientUser, payload: dict
) -> PendingRequest:
    await ensure_db_initialized()
    document_type = (
        str(payload.get("document_type") or payload.get("documentType") or "").strip().lower()
    )
    if document_type not in {"identity", "address"}:
        raise ValueError("documentType must be either 'identity' or 'address'")

    submission_payload = {
        **payload,
        "document_type": document_type,
        "user_id": _owner_user_id(profile),
        "client_profile_id": getattr(profile, "id", None),
        "client_name": getattr(profile, "full_name", None) or getattr(profile, "name", None),
        "client_email": profile.email,
    }
    pending_request = await PendingRequest.create(
        request_type="documents",
        client_name=getattr(profile, "full_name", None) or getattr(profile, "name", None),
        user_id=_owner_user_id(profile),
        amount=0.0,
        status="Pending",
        payload=submission_payload,
    )
    return pending_request


async def apply_approved_payment_request(
    request: PendingRequest,
    *,
    profile: ClientProfile | ClientUser | None = None,
) -> tuple[ClientBankDetail | None, ClientCryptoDetail | None]:
    await ensure_db_initialized()
    owner_id = _owner_user_id(profile) if profile is not None else request.user_id
    if owner_id is None:
        raise ValueError("Pending request is not linked to a client user")

    payload = request.payload or {}
    request_type = _normalize_payment_request_type(request.request_type)

    bank_detail: ClientBankDetail | None = None
    crypto_detail: ClientCryptoDetail | None = None

    if request_type == "bank":
        payload = {**payload, "status": "approved"}
        user = await ClientUser.filter(id=owner_id).first()
        if user is None:
            raise ValueError("Pending request is not linked to a client user")
        bank_detail = await upsert_client_bank_detail(user, payload)
    elif request_type == "crypto":
        payload = {**payload, "status": "approved"}
        user = await ClientUser.filter(id=owner_id).first()
        if user is None:
            raise ValueError("Pending request is not linked to a client user")
        crypto_detail = await upsert_client_crypto_detail(user, payload)
    else:
        raise ValueError(f"Unsupported payment request type: {request.request_type}")

    request.status = "Approved"
    request.reviewed_at = timezone.now()
    await request.save()
    return bank_detail, crypto_detail


async def apply_approved_profile_request(
    request: PendingRequest,
    *,
    user: ClientUser | None = None,
    profile: ClientProfile | None = None,
) -> tuple[ClientUser | None, ClientProfile | None]:
    await ensure_db_initialized()
    payload = request.payload or {}
    if user is None:
        if request.user_id:
            user = await ClientUser.filter(id=request.user_id).first()
        elif profile is not None:
            user = await ClientUser.filter(id=getattr(profile, "user_id", None)).first()
    if user is None:
        raise ValueError("Pending request is not linked to a client user")

    full_name = (
        str(payload.get("full_name") or payload.get("name") or user.full_name or user.name).strip()
        or user.name
    )
    phone = str(payload.get("phone") or user.phone or "").strip() or None
    country = str(payload.get("country") or user.country).strip() or user.country
    date_of_birth = (
        str(
            payload.get("date_of_birth") or payload.get("dateOfBirth") or user.date_of_birth or ""
        ).strip()
        or None
    )
    address = str(payload.get("address") or user.address or "").strip() or None
    city = str(payload.get("city") or user.city or "").strip() or None
    postal_code = (
        str(
            payload.get("postal_code") or payload.get("postalCode") or user.postal_code or ""
        ).strip()
        or None
    )
    tier = str(payload.get("tier") or user.tier).strip() or user.tier
    kyc_status = (
        str(payload.get("kyc_status") or payload.get("kycStatus") or user.kyc_status).strip()
        or user.kyc_status
    )
    avatar = str(payload.get("avatar") or user.avatar or "").strip() or None

    user.name = full_name
    user.full_name = full_name
    user.phone = phone
    user.country = country
    user.date_of_birth = date_of_birth
    user.address = address
    user.city = city
    user.postal_code = postal_code
    user.tier = tier
    user.kyc_status = kyc_status
    user.avatar = avatar
    await user.save()

    request.status = "Approved"
    request.reviewed_at = timezone.now()
    await request.save()
    return user, profile


async def apply_approved_document_request(
    request: PendingRequest,
    *,
    profile: ClientProfile | ClientUser | None = None,
) -> ClientDocument:
    await ensure_db_initialized()
    payload = request.payload or {}
    owner_id = _owner_user_id(profile) if profile is not None else request.user_id
    if owner_id is None:
        raise ValueError("Pending request is not linked to a client user")

    document_type = (
        str(payload.get("document_type") or payload.get("documentType") or "").strip().lower()
    )
    if document_type not in {"identity", "address"}:
        raise ValueError(f"Unsupported document request type: {request.request_type}")

    detail = await ClientDocument.filter(user_id=owner_id).first()
    if detail is None:
        detail = await ClientDocument.create(user_id=owner_id)

    file_name = str(payload.get("file_name") or payload.get("fileName") or "").strip() or None
    file_path = str(payload.get("file_path") or payload.get("filePath") or "").strip() or None
    status = "approved"

    if document_type == "identity":
        detail.identity_file_name = file_name
        detail.identity_file_path = file_path
        detail.identity_status = status
        detail.identity_uploaded_at = timezone.now()
    else:
        detail.address_file_name = file_name
        detail.address_file_path = file_path
        detail.address_status = status
        detail.address_uploaded_at = timezone.now()

    await detail.save()

    request.status = "Approved"
    request.reviewed_at = timezone.now()
    await request.save()
    return detail


def build_payment_details_payload(
    *,
    profile: ClientProfile,
    bank_detail: ClientBankDetail | None = None,
    crypto_detail: ClientCryptoDetail | None = None,
) -> dict:
    bank_data = serialize_client_bank_detail(bank_detail) or {
        "id": None,
        "account_holder": profile.full_name,
        "bank_name": "",
        "account_number": "",
        "ifsc_swift": "",
        "branch": "",
        "country": profile.country,
        "status": "pending",
        "created_at": None,
        "updated_at": None,
    }
    crypto_data = serialize_client_crypto_detail(crypto_detail) or {
        "id": None,
        "network": "USDT-TRC20",
        "wallet_address": "",
        "currency": "USDT",
        "status": "pending",
        "created_at": None,
        "updated_at": None,
    }

    payment_type = "bank"
    if crypto_data.get("wallet_address") and not bank_data.get("account_number"):
        payment_type = "crypto"

    return {
        "paymentType": payment_type,
        "bank": bank_data,
        "crypto": crypto_data,
    }


def build_document_details_payload(
    *,
    profile: ClientProfile,
    document_detail: ClientDocument | None = None,
    identity_request: PendingRequest | None = None,
    address_request: PendingRequest | None = None,
) -> dict:
    document_data = serialize_client_document_detail(document_detail) or {
        "id": None,
        "identity": {
            "file_name": None,
            "file_path": None,
            "status": "pending",
            "uploaded_at": None,
        },
        "address": {
            "file_name": None,
            "file_path": None,
            "status": "pending",
            "uploaded_at": None,
        },
        "created_at": None,
        "updated_at": None,
    }

    def _merge_pending(slot: str, request: PendingRequest | None) -> None:
        if request is None:
            return
        payload = request.payload or {}
        slot_payload = document_data[slot]
        slot_payload["file_name"] = (
            str(
                payload.get("file_name")
                or payload.get("fileName")
                or slot_payload.get("file_name")
                or ""
            ).strip()
            or None
        )
        slot_payload["file_path"] = (
            str(
                payload.get("file_path")
                or payload.get("filePath")
                or slot_payload.get("file_path")
                or ""
            ).strip()
            or None
        )
        slot_payload["status"] = _normalize_review_status(request.status)
        slot_payload["uploaded_at"] = (
            request.created_at.strftime("%Y-%m-%d %H:%M:%S")
            if request.created_at
            else slot_payload.get("uploaded_at")
        )

    _merge_pending("identity", identity_request)
    _merge_pending("address", address_request)

    return document_data


async def upsert_client_bank_detail(
    owner: ClientProfile | ClientUser, payload: dict
) -> ClientBankDetail:
    await ensure_db_initialized()
    user_id = _owner_user_id(owner)
    detail = await ClientBankDetail.filter(user_id=user_id).first()
    if detail is None:
        detail = await ClientBankDetail.create(
            user_id=user_id,
            account_holder=str(
                payload.get("account_holder")
                or getattr(owner, "full_name", None)
                or getattr(owner, "name", "")
            ).strip()
            or getattr(owner, "full_name", None)
            or getattr(owner, "name", ""),
            bank_name=str(payload.get("bank_name") or "").strip(),
            account_number=str(payload.get("account_number") or "").strip(),
            ifsc_swift=str(payload.get("ifsc_swift") or "").strip(),
            branch=str(payload.get("branch") or "").strip() or None,
            country=str(
                payload.get("country") or getattr(owner, "country", "United States")
            ).strip()
            or getattr(owner, "country", "United States"),
            status=_normalize_payment_status(payload.get("status")),
        )
        return detail

    owner_name = getattr(owner, "full_name", None) or getattr(owner, "name", "")
    owner_country = getattr(owner, "country", "United States")
    detail.account_holder = str(payload.get("account_holder") or owner_name).strip() or owner_name
    detail.bank_name = str(payload.get("bank_name") or detail.bank_name).strip()
    detail.account_number = str(payload.get("account_number") or detail.account_number).strip()
    detail.ifsc_swift = str(payload.get("ifsc_swift") or detail.ifsc_swift).strip()
    detail.branch = str(payload.get("branch") or detail.branch or "").strip() or None
    detail.country = (
        str(payload.get("country") or detail.country or owner_country).strip() or owner_country
    )
    if "status" in payload:
        detail.status = _normalize_payment_status(payload.get("status"), default=detail.status)
    await detail.save()
    return detail


async def upsert_client_crypto_detail(
    owner: ClientProfile | ClientUser, payload: dict
) -> ClientCryptoDetail:
    await ensure_db_initialized()
    user_id = _owner_user_id(owner)
    detail = await ClientCryptoDetail.filter(user_id=user_id).first()
    if detail is None:
        detail = await ClientCryptoDetail.create(
            user_id=user_id,
            network=str(payload.get("network") or "USDT-TRC20").strip() or "USDT-TRC20",
            wallet_address=str(payload.get("wallet_address") or "").strip(),
            currency=str(payload.get("currency") or "USDT").strip() or "USDT",
            status=_normalize_payment_status(payload.get("status")),
        )
        return detail

    owner_network = getattr(owner, "network", "USDT-TRC20")
    detail.network = (
        str(payload.get("network") or detail.network or "USDT-TRC20").strip() or "USDT-TRC20"
    )
    detail.wallet_address = str(payload.get("wallet_address") or detail.wallet_address).strip()
    detail.currency = str(payload.get("currency") or detail.currency or "USDT").strip() or "USDT"
    if "status" in payload:
        detail.status = _normalize_payment_status(payload.get("status"), default=detail.status)
    await detail.save()
    return detail


async def _resolve_client_user_id(request) -> int | None:
    await ensure_db_initialized()
    token = get_client_request_token(request)
    if token:
        payload = load_client_login_token(token)
        if payload is None:
            return None
        user_id = payload.get("user_id")
        return int(user_id) if user_id is not None else None


async def _get_client_profile_for_request(request):
    await ensure_db_initialized()
    user_id = await _resolve_client_user_id(request)
    if user_id is None:
        return None, _error("Authenticated session cookie is required", status=400)

    user = await ClientUser.filter(id=user_id).first()
    if user is None:
        return None, _error("Profile not found", status=404)

    return user, None


def create_client_login_token(user_id: int, email: str) -> str:
    """Create a short-lived signed token for a client session."""
    return _create_signed_login_token(
        key=CLIENT_LOGIN_KEY,
        payload={
            "user_id": user_id,
            "email": email,
            "ts": int(time.time()),
        },
    )


def create_admin_login_token(user_id: int, email: str, role: str, name: str | None = None) -> str:
    """Create a short-lived signed token for an admin session."""
    return _create_signed_login_token(
        key=ADMIN_LOGIN_KEY,
        payload={
            "user_id": user_id,
            "email": email,
            "name": name,
            "role": role,
            "ts": int(time.time()),
        },
    )


def _create_signed_login_token(*, key: str, payload: dict) -> str:
    payload_json = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(payload_json).rstrip(b"=").decode("ascii")
    signature = hmac.new(
        key.encode("utf-8"),
        payload_b64.encode("ascii"),
        hashlib.sha256,
    ).hexdigest()
    return f"{payload_b64}.{signature}"


def hash_client_password(password: str) -> str:
    """Hash a client password using PBKDF2."""
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        CLIENT_PASSWORD_HASH_ITERATIONS,
    )
    return (
        "pbkdf2_sha256$"
        f"{CLIENT_PASSWORD_HASH_ITERATIONS}$"
        f"{base64.urlsafe_b64encode(salt).decode('ascii').rstrip('=')}$"
        f"{base64.urlsafe_b64encode(digest).decode('ascii').rstrip('=')}"
    )


def verify_client_password(password: str, encoded: str | None) -> bool:
    """Verify a password against a stored PBKDF2 hash."""
    if not encoded:
        return False

    try:
        algorithm, iterations_raw, salt_b64, hash_b64 = encoded.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        iterations = int(iterations_raw)
        salt_padding = "=" * (-len(salt_b64) % 4)
        hash_padding = "=" * (-len(hash_b64) % 4)
        salt = base64.urlsafe_b64decode(f"{salt_b64}{salt_padding}".encode("ascii"))
        stored_hash = base64.urlsafe_b64decode(f"{hash_b64}{hash_padding}".encode("ascii"))
    except (ValueError, TypeError, UnicodeDecodeError):
        return False

    computed_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        iterations,
    )
    return hmac.compare_digest(stored_hash, computed_hash)


def load_client_login_token(token: str) -> dict | None:
    """Validate a client login token and return its payload if valid."""
    return _load_signed_login_token(token=token, key=CLIENT_LOGIN_KEY)


def load_admin_login_token(token: str) -> dict | None:
    """Validate an admin login token and return its payload if valid."""
    return _load_signed_login_token(token=token, key=ADMIN_LOGIN_KEY)


def _load_signed_login_token(token: str, key: str) -> dict | None:
    try:
        payload_b64, signature = token.split(".", 1)
    except ValueError:
        return None

    expected_signature = hmac.new(
        key.encode("utf-8"),
        payload_b64.encode("ascii"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(signature, expected_signature):
        return None

    padding = "=" * (-len(payload_b64) % 4)
    try:
        payload_json = base64.urlsafe_b64decode(f"{payload_b64}{padding}".encode("ascii"))
        payload = json.loads(payload_json.decode("utf-8"))
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError):
        return None

    issued_at = payload.get("ts")
    if not isinstance(issued_at, int):
        return None
    if int(time.time()) - issued_at > CLIENT_LOGIN_MAX_AGE:
        return None

    user_id = payload.get("user_id")
    if user_id is None:
        return None
    try:
        payload["user_id"] = int(user_id)
    except (TypeError, ValueError):
        return None
    return payload
