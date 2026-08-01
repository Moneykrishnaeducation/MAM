"""MAM account creation endpoint for adminPanel."""

import json
import random
import string

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from adminPanel.models import MamAccount
from backendPanel.permissions import IsAdmin, permission_required


def _generate_mam_account_number(length: int = 6) -> str:
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=length))
    return f"MAM-{suffix}"


@csrf_exempt
@permission_required(IsAdmin)
@require_http_methods(["POST"])
async def create_mam_account(request):
    """Create a new MAM account."""
    try:
        body = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"status": "error", "message": "Invalid JSON body"}, status=400)

    account_number = str(body.get("account_number") or "").strip()
    broker = str(body.get("broker") or "Equinix Direct").strip()
    master_strategy = str(body.get("master_strategy") or "").strip()
    leverage = str(body.get("leverage") or "1:500").strip()
    status = str(body.get("status") or "Operational").strip()

    try:
        total_balance = float(body.get("total_balance") or 0.0)
    except (TypeError, ValueError):
        return JsonResponse(
            {"status": "error", "message": "total_balance must be a valid number"},
            status=400,
        )

    if not master_strategy:
        return JsonResponse(
            {"status": "error", "message": "master_strategy is required"},
            status=400,
        )

    if not account_number:
        account_number = _generate_mam_account_number()

    while await MamAccount.filter(account_number=account_number).exists():
        account_number = _generate_mam_account_number()

    mam_account = await MamAccount.create(
        account_number=account_number,
        broker=broker,
        master_strategy=master_strategy,
        leverage=leverage,
        total_balance=total_balance,
        status=status,
    )

    return JsonResponse(
        {
            "status": "ok",
            "message": "MAM account created successfully",
            "mam_account": {
                "id": mam_account.id,
                "account_number": mam_account.account_number,
                "broker": mam_account.broker,
                "master_strategy": mam_account.master_strategy,
                "leverage": mam_account.leverage,
                "total_balance": mam_account.total_balance,
                "status": mam_account.status,
                "created_at": mam_account.created_at.strftime("%Y-%m-%d %H:%M:%S")
                if mam_account.created_at
                else None,
            },
        },
        status=201,
    )
