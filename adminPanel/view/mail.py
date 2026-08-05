"""Admin mail compose and delivery endpoints."""

from __future__ import annotations

import json
from email.utils import parseaddr

from asgiref.sync import sync_to_async
from django.conf import settings
from django.core.mail import EmailMessage, EmailMultiAlternatives
from django.http import JsonResponse
from django.utils import timezone
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


def _mail_from_address() -> str:
    return str(
        getattr(settings, "DEFAULT_FROM_EMAIL", None)
        or getattr(settings, "EMAIL_HOST_USER", None)
        or "no-reply@example.com"
    ).strip()


def _serialize_mail_message(message: AdminMailMessage) -> dict:
    return {
        "id": message.id,
        "subject": message.subject,
        "body": message.body,
        "html_body": message.html_body,
        "to": message.to_recipients or [],
        "cc": message.cc_recipients or [],
        "bcc": message.bcc_recipients or [],
        "reply_to": message.reply_to or [],
        "status": message.status,
        "error_message": message.error_message,
        "sent_at": message.sent_at.strftime("%Y-%m-%d %H:%M:%S") if message.sent_at else None,
        "created_at": message.created_at.strftime("%Y-%m-%d %H:%M:%S") if message.created_at else None,
        "updated_at": message.updated_at.strftime("%Y-%m-%d %H:%M:%S") if message.updated_at else None,
        "created_by_id": message.created_by_id,
    }


async def _send_mail_message(message: AdminMailMessage) -> None:
    from_email = _mail_from_address()
    to_recipients = message.to_recipients or []
    cc_recipients = message.cc_recipients or []
    bcc_recipients = message.bcc_recipients or []
    reply_to = message.reply_to or []
    body = message.body or ""
    html_body = message.html_body or ""

    if html_body.strip():
        email_message = EmailMultiAlternatives(
            subject=message.subject,
            body=body,
            from_email=from_email,
            to=to_recipients,
            cc=cc_recipients,
            bcc=bcc_recipients,
            reply_to=reply_to or None,
        )
        email_message.attach_alternative(html_body, "text/html")
    else:
        email_message = EmailMessage(
            subject=message.subject,
            body=body,
            from_email=from_email,
            to=to_recipients,
            cc=cc_recipients,
            bcc=bcc_recipients,
            reply_to=reply_to or None,
        )

    await sync_to_async(email_message.send, thread_sensitive=True)(fail_silently=False)


@csrf_exempt
@permission_required(IsAdmin)
@require_http_methods(["GET", "POST"])
async def admin_mails(request):
    """List stored mail drafts/sends or compose and deliver a new mail."""
    await ensure_db_initialized()

    if request.method == "GET":
        status_filter = str(request.GET.get("status") or "").strip().lower()
        limit_raw = request.GET.get("limit") or "25"
        try:
            limit = max(1, min(int(limit_raw), 100))
        except (TypeError, ValueError):
            limit = 25

        query = AdminMailMessage.all().order_by("-created_at")
        if status_filter:
            query = query.filter(status=status_filter)

        messages = await query.limit(limit)
        payload = [_serialize_mail_message(message) for message in messages]
        summary = {
            "draft": await AdminMailMessage.filter(status="draft").count(),
            "sending": await AdminMailMessage.filter(status="sending").count(),
            "sent": await AdminMailMessage.filter(status="sent").count(),
            "failed": await AdminMailMessage.filter(status="failed").count(),
        }
        return JsonResponse({"status": "ok", "messages": payload, "summary": summary, "count": len(payload)})

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
    if getattr(request, "user", None) is not None and getattr(request.user, "is_authenticated", False):
        created_by = getattr(request.user, "id", None)

    mail_message = await AdminMailMessage.create(
        created_by_id=created_by,
        subject=subject,
        body=message_body,
        html_body=html_body,
        to_recipients=to_recipients,
        cc_recipients=cc_recipients,
        bcc_recipients=bcc_recipients,
        reply_to=reply_to,
        status="draft" if not send_now else "sending",
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
        await _send_mail_message(mail_message)
    except Exception as exc:
        mail_message.status = "failed"
        mail_message.error_message = str(exc)
        mail_message.sent_at = None
        await mail_message.save(update_fields=["status", "error_message", "sent_at", "updated_at"])
        return _error(
            "Unable to send email",
            status=502,
            mail=_serialize_mail_message(mail_message),
        )

    mail_message.status = "sent"
    mail_message.error_message = None
    mail_message.sent_at = timezone.now()
    await mail_message.save(update_fields=["status", "error_message", "sent_at", "updated_at"])

    return JsonResponse(
        {
            "status": "ok",
            "message": "Mail sent successfully",
            "mail": _serialize_mail_message(mail_message),
        },
        status=201,
    )
