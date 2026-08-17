"""Admin mail compose and queue endpoints."""

from __future__ import annotations

import json
from email.utils import parseaddr

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from adminPanel.models import AdminMailMessage
from backendPanel.database import ensure_db_initialized
from backendPanel.permissions import IsAdmin, permission_required


def _error(message: str, status: int = 400, **extra):
    payload = {"status": "error", "message": message}
    payload.update(extra)
    return JsonResponse(payload, status=status)


def _normalize_recipients(raw) -> list[str]:
    if raw is None:
        return []
    values = raw
    if isinstance(raw, str):
        values = [part.strip() for part in raw.replace(";", ",").split(",")]
    elif not isinstance(raw, list):
        values = [raw]

    recipients: list[str] = []
    for item in values:
        candidate = str(item or "").strip()
        if not candidate:
            continue
        _, address = parseaddr(candidate)
        recipients.append(address or candidate)
    return [recipient for recipient in recipients if recipient]


def _coerce_bool(value, default: bool = False) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return bool(value)


def _frontend_base_url() -> str:
    return str(getattr(settings, "FRONTEND_BASE_URL", None) or "http://localhost:3000").rstrip("/")


def _frontend_base_url() -> str:
    return str(getattr(settings, "FRONTEND_BASE_URL", None) or "http://localhost:3000").rstrip("/")


def _serialize_mail_message(message: AdminMailMessage) -> dict:
    return {
        "id": message.id,
        "source": message.source,
        "from_email": message.from_email,
        "subject": message.subject,
        "body": message.body,
        "html_body": message.html_body,
        "to": message.to_recipients or [],
        "cc": message.cc_recipients or [],
        "bcc": message.bcc_recipients or [],
        "reply_to": message.reply_to or [],
        "status": message.status,
        "payload": message.payload or {},
        "attempt_count": message.attempt_count,
        "queued_at": message.queued_at.strftime("%Y-%m-%d %H:%M:%S") if message.queued_at else None,
        "last_attempt_at": message.last_attempt_at.strftime("%Y-%m-%d %H:%M:%S")
        if message.last_attempt_at
        else None,
        "error_message": message.error_message,
        "sent_at": message.sent_at.strftime("%Y-%m-%d %H:%M:%S") if message.sent_at else None,
        "created_at": message.created_at.strftime("%Y-%m-%d %H:%M:%S")
        if message.created_at
        else None,
        "updated_at": message.updated_at.strftime("%Y-%m-%d %H:%M:%S")
        if message.updated_at
        else None,
        "created_by_id": message.created_by_id,
    }


@csrf_exempt
@permission_required(IsAdmin)
@require_http_methods(["GET", "POST"])
async def admin_mails(request):
    """List stored mail drafts/queue entries or create a new queued mail."""
    await ensure_db_initialized()

    if request.method == "GET":
        from tortoise.expressions import Q
        import math

        status_filter = str(request.GET.get("status") or "").strip().lower()
        category_filter = str(request.GET.get("category") or "").strip().lower()
        search_query = str(request.GET.get("search") or "").strip()
        from_date = str(request.GET.get("from") or "").strip()
        to_date = str(request.GET.get("to") or "").strip()
        
        try:
            page = max(1, int(request.GET.get("page") or "1"))
        except (TypeError, ValueError):
            page = 1
            
        try:
            page_size = max(1, min(int(request.GET.get("page_size") or "25"), 100))
        except (TypeError, ValueError):
            page_size = 25

        query = AdminMailMessage.all().order_by("-created_at")
        
        if status_filter and status_filter != "all":
            query = query.filter(status=status_filter)
            
        if category_filter and category_filter != "all":
            if category_filter == "broadcast":
                query = query.filter(source="admin")
            elif category_filter == "deposit":
                query = query.filter(subject__icontains="deposit")
            elif category_filter == "withdrawal":
                query = query.filter(subject__icontains="withdraw")
            elif category_filter == "security":
                query = query.filter(
                    Q(subject__icontains="password") |
                    Q(subject__icontains="verification") |
                    Q(subject__icontains="login") |
                    Q(subject__icontains="code") |
                    Q(subject__icontains="security")
                )
            elif category_filter == "account":
                query = query.filter(
                    Q(subject__icontains="account") |
                    Q(subject__icontains="profile") |
                    Q(subject__icontains="kyc") |
                    Q(subject__icontains="welcome") |
                    Q(subject__icontains="credentials") |
                    Q(subject__icontains="detail")
                )
            elif category_filter == "trade_report":
                query = query.filter(
                    Q(subject__icontains="trade") |
                    Q(subject__icontains="report") |
                    Q(subject__icontains="statement") |
                    Q(subject__icontains="margin")
                )
            else:
                query = query.filter(source=category_filter)
            
        if search_query:
            query = query.filter(
                Q(subject__icontains=search_query) |
                Q(body__icontains=search_query) |
                Q(from_email__icontains=search_query)
            )

        if from_date:
            query = query.filter(created_at__gte=from_date)
        if to_date:
            # To include the entire end day, we could append time if only date is provided
            if len(to_date) == 10:  # YYYY-MM-DD
                to_date = f"{to_date}T23:59:59.999Z"
            query = query.filter(created_at__lte=to_date)

        total_count = await query.count()
        total_pages = math.ceil(total_count / page_size) if total_count > 0 else 1
        
        offset = (page - 1) * page_size
        messages = await query.offset(offset).limit(page_size)
        payload = [_serialize_mail_message(message) for message in messages]
        
        summary = {
            "draft": await AdminMailMessage.filter(status="draft").count(),
            "queued": await AdminMailMessage.filter(status="queued").count(),
            "sending": await AdminMailMessage.filter(status="sending").count(),
            "sent": await AdminMailMessage.filter(status="sent").count(),
            "failed": await AdminMailMessage.filter(status="failed").count(),
        }
        
        category_counts = {
            "all": total_count,
            "broadcast": await AdminMailMessage.filter(source="admin").count(),
            "deposit": await AdminMailMessage.filter(subject__icontains="deposit").count(),
            "withdrawal": await AdminMailMessage.filter(subject__icontains="withdraw").count(),
            "security": await AdminMailMessage.filter(
                Q(subject__icontains="password") |
                Q(subject__icontains="verification") |
                Q(subject__icontains="login") |
                Q(subject__icontains="code") |
                Q(subject__icontains="security")
            ).count(),
            "account": await AdminMailMessage.filter(
                Q(subject__icontains="account") |
                Q(subject__icontains="profile") |
                Q(subject__icontains="kyc") |
                Q(subject__icontains="welcome") |
                Q(subject__icontains="credentials") |
                Q(subject__icontains="detail")
            ).count(),
            "trade_report": await AdminMailMessage.filter(
                Q(subject__icontains="trade") |
                Q(subject__icontains="report") |
                Q(subject__icontains="statement") |
                Q(subject__icontains="margin")
            ).count(),
        }
        
        return JsonResponse(
            {
                "status": "ok", 
                "messages": payload, 
                "summary": summary,
                "categories": category_counts,
                "count": total_count,
                "total_pages": total_pages,
                "current_page": page
            }
        )

    try:
        body = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, ValueError):
        return _error("Invalid JSON body", status=400)

    subject = str(body.get("subject") or "").strip()
    message_body = str(body.get("body") or body.get("message") or "").strip()
    html_body = str(body.get("html_body") or body.get("html") or "").strip() or None
    to_recipients = _normalize_recipients(body.get("to") or body.get("recipients"))
    cc_recipients = _normalize_recipients(body.get("cc"))
    bcc_recipients = _normalize_recipients(body.get("bcc"))
    reply_to = _normalize_recipients(body.get("reply_to") or body.get("replyTo"))
    send_now = _coerce_bool(body.get("send_now", body.get("sendNow")), default=True)

    if not subject:
        return _error("subject is required", status=400)
    if not message_body:
        return _error("body is required", status=400)
    if send_now and not to_recipients:
        return _error("At least one recipient is required", status=400)

    created_by = None
    if getattr(request, "user", None) is not None and getattr(
        request.user, "is_authenticated", False
    ):
        created_by = getattr(request.user, "id", None)

    mail_message = await AdminMailMessage.create(
        created_by_id=created_by,
        source="admin",
        from_email=None,
        subject=subject,
        body=message_body,
        html_body=html_body,
        to_recipients=to_recipients,
        cc_recipients=cc_recipients,
        bcc_recipients=bcc_recipients,
        reply_to=reply_to,
        status="draft" if not send_now else "queued",
    )

    if not send_now:
        return JsonResponse(
            {
                "status": "ok",
                "message": "Mail draft saved",
                "mail": _serialize_mail_message(mail_message),
            },
            status=201,
        )

    try:
        from django.utils import timezone

        mail_message.status = "queued"
        mail_message.queued_at = timezone.now()
        await mail_message.save(update_fields=["status", "queued_at", "updated_at"])
    except Exception as exc:
        mail_message.status = "failed"
        mail_message.error_message = str(exc)
        await mail_message.save(update_fields=["status", "error_message", "updated_at"])
        return _error(
            "Unable to queue email", status=502, mail=_serialize_mail_message(mail_message)
        )

    return JsonResponse(
        {
            "status": "ok",
            "message": "Mail queued successfully",
            "mail": _serialize_mail_message(mail_message),
        },
        status=201,
    )
