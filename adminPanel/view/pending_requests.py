"""Admin pending-request endpoints split by request tab."""

from __future__ import annotations

from collections.abc import Iterable
from datetime import datetime

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from tortoise.expressions import Q

from adminPanel.models import PendingRequest
from backendPanel.permissions import IsAdmin, permission_required

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


def _serialize_pending_request(request: PendingRequest, tab: str) -> dict:
    title = TAB_DEFAULT_TITLES[tab]
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
        "documentType": title,
        "docNumber": f"{title[:3].upper()}-{request.id}",
        "fileName": f"{tab}_{request.id}.pdf",
        "fieldToUpdate": title,
        "currentValue": request.client_name,
        "requestedValue": request.client_name,
        "reason": f"{title} request submitted through the admin portal.",
        "bankName": f"{title} Bank",
        "accountHolder": request.client_name,
        "accountNumber": f"**** {request.id:04d}",
        "swiftCode": f"SWFT{request.id:04d}",
        "network": "USDT-TRC20",
        "walletAddress": f"wallet-{request.id:04d}",
        "label": f"{title} Wallet",
        "request_type": request.request_type,
        "raw_request_type": _sanitize_request_type(request.request_type),
    }


async def _fetch_pending_requests_for_tab(tab: str) -> list[dict]:
    aliases = TAB_ALIASES[tab]
    condition = _match_condition(aliases)
    queryset = PendingRequest.all().order_by("-created_at")
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
