"""Admin pending-request endpoints split by request tab."""

from __future__ import annotations

import json
from collections.abc import Iterable
from datetime import datetime

from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from tortoise.expressions import Q

from adminPanel.models import ClientUser, PendingRequest
from backendPanel.permissions import IsAdmin, permission_required
from clientPanel.view.common import (
    apply_approved_document_request,
    apply_approved_payment_request,
    apply_approved_profile_request,
)

TAB_ALIASES: dict[str, tuple[str, ...]] = {
    "deposits": ("deposit", "deposits"),
    "withdrawals": ("withdraw", "withdrawal", "withdrawals"),
    "documents": ("document", "documents", "kyc", "verification"),
    "profiles": ("profile", "profiles"),
    "banks": ("bank", "banks", "bank account"),
    "cryptos": ("crypto", "cryptos", "wallet", "wallets"),
}

TAB_DEFAULT_METHODS = {
    "deposits": "Bank Wire Transfer",
    "withdrawals": "Bank Transfer",
    "documents": "Document Upload",
    "profiles": "Profile Update",
    "banks": "Bank Transfer",
    "cryptos": "Crypto USDT",
}

TAB_DEFAULT_TITLES = {
    "deposits": "Deposit",
    "withdrawals": "Withdrawal",
    "documents": "Document",
    "profiles": "Profile Update",
    "banks": "Bank Account",
    "cryptos": "Crypto Wallet",
}


def _format_timestamp(value: datetime | None) -> str:
    return value.strftime("%Y-%m-%d %H:%M:%S") if value else "Just now"


def _sanitize_request_type(value: str | None) -> str:
    return (value or "").strip().lower()


def _match_condition(aliases: Iterable[str]) -> Q | None:
    condition: Q | None = None
    for alias in aliases:
        current = Q(request_type__iexact=alias) | Q(request_type__icontains=alias)
        condition = current if condition is None else condition | current
    return condition


def _requester_email(name: str) -> str:
    slug = "".join(ch for ch in name.lower() if ch.isalnum())
    return f"{slug or 'requester'}@moneykrishna.com"


def _avatar_url(name: str) -> str:
    return (
        "https://ui-avatars.com/api/"
        f"?name={name.replace(' ', '+')}&background=1e3a5f&color=7dd3fc"
    )


def _mask_sensitive_value(value: str | None, keep_last: int = 4) -> str:
    raw = "".join(ch for ch in str(value or "").strip() if ch.isalnum())
    if not raw:
        return ""
    if len(raw) <= keep_last:
        return raw
    return f"**** {raw[-keep_last:]}"


def _pending_payload(request: PendingRequest) -> dict:
    payload = request.payload if isinstance(request.payload, dict) else {}
    return payload if isinstance(payload, dict) else {}


async def _resolve_user_for_pending_request(pending_request: PendingRequest) -> ClientUser | None:
    if pending_request.user_id:
        user = await ClientUser.filter(id=pending_request.user_id).first()
        if user is not None:
            return user

    payload = _pending_payload(pending_request)
    candidate_user_ids = [
        payload.get("profile_id"),
        payload.get("user_id"),
    ]
    for raw_user_id in candidate_user_ids:
        try:
            user_id = int(raw_user_id)
        except (TypeError, ValueError):
            continue
        user = await ClientUser.filter(id=user_id).first()
        if user is not None:
            pending_request.user = user
            await pending_request.save(update_fields=["user"])
            return user

    for key in ("client_email", "email"):
        email = str(payload.get(key) or "").strip().lower()
        if not email:
            continue
        user = await ClientUser.filter(email=email).first()
        if user is not None:
            pending_request.user = user
            await pending_request.save(update_fields=["user"])
            return user

    candidate_names = [
        str(payload.get("client_name") or "").strip(),
        str(payload.get("full_name") or "").strip(),
        str(payload.get("account_holder") or "").strip(),
        str(pending_request.client_name or "").strip(),
    ]
    for name in candidate_names:
        if not name:
            continue
        user = await ClientUser.filter(name__iexact=name).first()
        if user is not None:
            pending_request.user = user
            await pending_request.save(update_fields=["user"])
            return user

    return None


def _tab_for_request_type(request_type: str | None) -> str:
    normalized = _sanitize_request_type(request_type)
    for tab, aliases in TAB_ALIASES.items():
        if normalized in aliases:
            return tab
    return "profiles"


def _serialize_pending_request(request: PendingRequest, tab: str) -> dict:
    title = TAB_DEFAULT_TITLES[tab]
    payload = _pending_payload(request)
    request_type = _sanitize_request_type(request.request_type)
    document_type = str(payload.get("document_type") or payload.get("documentType") or "").strip().lower()
    bank_name = payload.get("bank_name") or payload.get("bankName") or f"{title} Bank"
    account_holder = payload.get("account_holder") or payload.get("accountHolder") or request.client_name
    account_number = payload.get("account_number") or payload.get("accountNumber") or f"**** {request.id:04d}"
    swift_code = payload.get("ifsc_swift") or payload.get("ifscSwift") or f"SWFT{request.id:04d}"
    network = payload.get("network") or "USDT-TRC20"
    wallet_address = payload.get("wallet_address") or payload.get("cryptoAddress") or f"wallet-{request.id:04d}"
    file_name = payload.get("file_name") or payload.get("fileName")
    file_url = payload.get("file_url") or payload.get("fileUrl")
    requested_value = request.client_name
    if request_type == "profile":
        requested_value = (
            payload.get("full_name")
            or payload.get("name")
            or request.client_name
        )
    elif request_type == "bank":
        requested_value = payload.get("bank_name") or payload.get("bankName") or request.client_name
    elif request_type == "crypto":
        requested_value = payload.get("wallet_address") or payload.get("cryptoAddress") or request.client_name
    elif request_type in {"document", "documents"}:
        requested_value = file_name or request.client_name
    return {
        "id": f"{tab[:3].upper()}-{request.id}",
        "requesterName": request.client_name,
        "requesterEmail": _requester_email(request.client_name),
        "avatar": _avatar_url(request.client_name),
        "date": _format_timestamp(request.created_at),
        "status": request.status,
        "priority": "Normal",
        "amount": f"${request.amount:,.2f}",
        "method": TAB_DEFAULT_METHODS[tab],
        "referenceNo": f"{title[:3].upper()}-{request.id}",
        "proofUrl": None,
        "availableBalance": None,
        "payoutDestination": None,
        "documentType": "Identity Document" if document_type == "identity" else "Address Document" if document_type == "address" else title,
        "docNumber": f"{title[:3].upper()}-{request.id}",
        "fileName": file_name or f"{tab}_{request.id}.pdf",
        "previewUrl": file_url,
        "fieldToUpdate": title,
        "currentValue": request.client_name,
        "requestedValue": requested_value,
        "reason": f"{title} request submitted through the admin portal.",
        "bankName": bank_name,
        "accountHolder": account_holder,
        "accountNumber": _mask_sensitive_value(account_number) or account_number,
        "swiftCode": swift_code,
        "network": network,
        "walletAddress": wallet_address,
        "label": payload.get("currency") or payload.get("cryptoCurrency") or f"{title} Wallet",
        "request_type": request.request_type,
        "raw_request_type": _sanitize_request_type(request.request_type),
    }


async def _fetch_pending_requests_for_tab(tab: str) -> list[dict]:
    aliases = TAB_ALIASES[tab]
    condition = _match_condition(aliases)
    queryset = PendingRequest.filter(status__iexact="pending").order_by("-created_at")
    if condition is not None:
        queryset = queryset.filter(condition)

    items = await queryset
    return [_serialize_pending_request(item, tab) for item in items]


async def _tab_response(tab: str) -> JsonResponse:
    items = await _fetch_pending_requests_for_tab(tab)
    return JsonResponse({"status": "ok", "tab": tab, "count": len(items), "requests": items})


@permission_required(IsAdmin)
@require_http_methods(["GET"])
async def list_pending_requests(request):
    requests: list[dict] = []
    for tab in TAB_ALIASES:
        requests.extend(await _fetch_pending_requests_for_tab(tab))

    return JsonResponse({"status": "ok", "requests": requests})


@permission_required(IsAdmin)
@require_http_methods(["GET"])
async def list_pending_deposits(request):
    return await _tab_response("deposits")


@permission_required(IsAdmin)
@require_http_methods(["GET"])
async def list_pending_withdrawals(request):
    return await _tab_response("withdrawals")


@permission_required(IsAdmin)
@require_http_methods(["GET"])
async def list_pending_documents(request):
    return await _tab_response("documents")


@permission_required(IsAdmin)
@require_http_methods(["GET"])
async def list_pending_profiles(request):
    return await _tab_response("profiles")


@permission_required(IsAdmin)
@require_http_methods(["GET"])
async def list_pending_banks(request):
    return await _tab_response("banks")


@permission_required(IsAdmin)
@require_http_methods(["GET"])
async def list_pending_cryptos(request):
    return await _tab_response("cryptos")


@permission_required(IsAdmin)
@require_http_methods(["GET"])
async def list_pending_requests_summary(request):
    summary: dict[str, int] = {}
    for tab in TAB_ALIASES:
        summary[tab] = len(await _fetch_pending_requests_for_tab(tab))

    return JsonResponse({"status": "ok", "summary": summary, "total": sum(summary.values())})


def _resolve_pending_request_id(request_id: str) -> int | None:
    raw_id = str(request_id or "").strip()
    if not raw_id:
        return None
    if "-" in raw_id:
        raw_id = raw_id.rsplit("-", 1)[-1]
    try:
        return int(raw_id)
    except ValueError:
        return None


@csrf_exempt
@permission_required(IsAdmin)
@require_http_methods(["POST", "PUT"])
async def decide_pending_request(request, request_id: str):
    pending_id = _resolve_pending_request_id(request_id)
    if pending_id is None:
        return JsonResponse({"status": "error", "message": "Invalid pending request id"}, status=400)

    pending_request = await PendingRequest.filter(id=pending_id).first()
    if pending_request is None:
        return JsonResponse({"status": "error", "message": "Pending request not found"}, status=404)

    try:
        body = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"status": "error", "message": "Invalid JSON body"}, status=400)

    decision = str(body.get("status") or body.get("decision") or "").strip().lower()
    if decision not in {"approved", "rejected"}:
        return JsonResponse(
            {"status": "error", "message": "status must be either 'Approved' or 'Rejected'"},
            status=400,
        )

    if decision == "approved":
        request_type = _sanitize_request_type(pending_request.request_type)
        if request_type in {"bank", "crypto"}:
            user = await _resolve_user_for_pending_request(pending_request)
            if user is None:
                return JsonResponse(
                    {
                        "status": "error",
                        "message": "Unable to resolve client profile for this payment request",
                    },
                    status=400,
                )
            await apply_approved_payment_request(pending_request, profile=user)
        elif request_type == "profile":
            user = await _resolve_user_for_pending_request(pending_request)
            if user is None:
                return JsonResponse(
                    {
                        "status": "error",
                        "message": "Unable to resolve client profile for this profile request",
                    },
                    status=400,
                )
            await apply_approved_profile_request(pending_request, user=user)
        elif request_type in {"document", "documents"}:
            user = await _resolve_user_for_pending_request(pending_request)
            if user is None:
                return JsonResponse(
                    {
                        "status": "error",
                        "message": "Unable to resolve client profile for this document request",
                    },
                    status=400,
                )
            await apply_approved_document_request(pending_request, profile=user)
        elif request_type in {"deposit", "deposits", "withdrawal", "withdrawals"}:
            pending_request.status = "Approved"
            pending_request.reviewed_at = timezone.now()
            await pending_request.save()

            from adminPanel.models import ClientAccount, ClientTransaction, TradingAccount
            from adminPanel.mt5.services import MT5ManagerActions

            payload = _pending_payload(pending_request)
            tx_id = payload.get("transaction_id")
            if tx_id:
                tx = await ClientTransaction.filter(id=tx_id).first()
                if tx:
                    tx.status = "Approved"
                    await tx.save()

                    amount = float(tx.amount)
                    account_number = tx.account_number

                    # 1. Update ClientAccount in DB
                    acc = await ClientAccount.filter(user_id=pending_request.user_id, account_number=account_number).first()
                    if acc:
                        if request_type in {"deposit", "deposits"}:
                            acc.balance = float(acc.balance or 0.0) + amount
                        else:
                            acc.balance = float(acc.balance or 0.0) - amount
                        await acc.save()

                    # 2. Execute MT5 operation and update TradingAccount in DB
                    t_acc = await TradingAccount.filter(user_id=pending_request.user_id, account_id=account_number).first()
                    if not t_acc:
                        t_acc = await TradingAccount.filter(account_id=account_number).first()

                    if t_acc:
                        try:
                            mt5 = MT5ManagerActions()
                            mt5_login = int(t_acc.account_id)
                            comment = f"Admin Request Approval ({request_type})"
                            if request_type in {"deposit", "deposits"}:
                                mt5.deposit_funds(mt5_login, amount, comment)
                            else:
                                mt5.withdraw_funds(mt5_login, amount, comment)
                        except Exception as exc:
                            import logging
                            logger = logging.getLogger(__name__)
                            logger.error(f"[MT5] Error executing {request_type} for account {account_number}: {exc}")

                        if request_type in {"deposit", "deposits"}:
                            t_acc.balance = float(t_acc.balance or 0.0) + amount
                        else:
                            t_acc.balance = float(t_acc.balance or 0.0) - amount
                        await t_acc.save()
        else:
            pending_request.status = "Approved"
            pending_request.reviewed_at = timezone.now()
            await pending_request.save()
    else:
        pending_request.status = "Rejected"
        pending_request.reviewed_at = timezone.now()
        await pending_request.save()

        request_type = _sanitize_request_type(pending_request.request_type)
        if request_type in {"deposit", "deposits", "withdrawal", "withdrawals"}:
            from adminPanel.models import ClientTransaction
            payload = _pending_payload(pending_request)
            tx_id = payload.get("transaction_id")
            if tx_id:
                tx = await ClientTransaction.filter(id=tx_id).first()
                if tx:
                    tx.status = "Rejected"
                    await tx.save()

    return JsonResponse(
        {
            "status": "ok",
            "message": f"Request {decision}",
            "request": _serialize_pending_request(pending_request, _tab_for_request_type(pending_request.request_type)),
        }
    )
