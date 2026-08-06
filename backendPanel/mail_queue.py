"""Database-backed mail queue helpers."""

from __future__ import annotations

import threading
from collections.abc import Iterable
import logging
from typing import Any
from time import sleep

from asgiref.sync import async_to_sync, sync_to_async
from django.conf import settings
from django.core.mail import EmailMessage, EmailMultiAlternatives
from django.utils import timezone

from adminPanel.models import AdminMailMessage
from backendPanel.database import ensure_db_initialized

logger = logging.getLogger(__name__)


def _normalize_recipients(raw: Any) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, str):
        raw = [part.strip() for part in raw.replace(";", ",").split(",")]
    elif not isinstance(raw, Iterable):
        raw = [raw]

    recipients: list[str] = []
    for item in raw:
        candidate = str(item or "").strip()
        if candidate:
            recipients.append(candidate)
    return recipients


def _mail_from_address() -> str:
    return str(
        getattr(settings, "DEFAULT_FROM_EMAIL", None)
        or getattr(settings, "EMAIL_HOST_USER", None)
        or "no-reply@example.com"
    ).strip()


_mail_worker_started = False
_mail_worker_lock = threading.Lock()


def _resolve_mail_worker_interval(interval_seconds: float | int | None) -> float:
    try:
        interval = float(interval_seconds if interval_seconds is not None else 5.0)
    except (TypeError, ValueError):
        interval = 5.0
    return max(1.0, interval)


async def queue_email_message(
    *,
    subject: str,
    body: str,
    to: list[str] | tuple[str, ...] | str,
    html_body: str | None = None,
    cc: list[str] | tuple[str, ...] | str | None = None,
    bcc: list[str] | tuple[str, ...] | str | None = None,
    reply_to: list[str] | tuple[str, ...] | str | None = None,
    created_by_id: int | None = None,
    source: str = "system",
    payload: dict | None = None,
    from_email: str | None = None,
) -> AdminMailMessage:
    """Store an outbound mail request in the queue table."""
    await ensure_db_initialized()
    return await AdminMailMessage.create(
        created_by_id=created_by_id,
        source=source,
        from_email=(from_email or _mail_from_address()).strip() or None,
        subject=subject,
        body=body,
        html_body=html_body,
        to_recipients=_normalize_recipients(to),
        cc_recipients=_normalize_recipients(cc),
        bcc_recipients=_normalize_recipients(bcc),
        reply_to=_normalize_recipients(reply_to),
        status="queued",
        payload=payload or {},
        queued_at=timezone.now(),
    )


def _build_email_message(message: AdminMailMessage) -> EmailMessage:
    from_email = message.from_email or _mail_from_address()
    to_recipients = message.to_recipients or []
    cc_recipients = message.cc_recipients or []
    bcc_recipients = message.bcc_recipients or []
    reply_to = message.reply_to or []

    if (message.html_body or "").strip():
        email_message = EmailMultiAlternatives(
            subject=message.subject,
            body=message.body or "",
            from_email=from_email,
            to=to_recipients,
            cc=cc_recipients,
            bcc=bcc_recipients,
            reply_to=reply_to or None,
        )
        email_message.attach_alternative(message.html_body or "", "text/html")
        return email_message

    return EmailMessage(
        subject=message.subject,
        body=message.body or "",
        from_email=from_email,
        to=to_recipients,
        cc=cc_recipients,
        bcc=bcc_recipients,
        reply_to=reply_to or None,
    )


async def process_mail_queue(*, limit: int = 100) -> dict[str, int]:
    """Send queued or previously failed mail messages and mark them sent/failed."""
    await ensure_db_initialized()
    queued_messages = (
        await AdminMailMessage.filter(status__in=["queued", "failed"])
        .order_by("created_at")
        .limit(limit)
    )

    processed = 0
    sent = 0
    failed = 0

    for message in queued_messages:
        processed += 1
        message.status = "sending"
        message.attempt_count = int(message.attempt_count or 0) + 1
        message.last_attempt_at = timezone.now()
        message.error_message = None
        await message.save(
            update_fields=["status", "attempt_count", "last_attempt_at", "error_message", "updated_at"]
        )

        try:
            email_message = _build_email_message(message)
            await sync_to_async(email_message.send, thread_sensitive=True)(fail_silently=False)
        except Exception as exc:
            message.status = "failed"
            message.error_message = str(exc)
            message.sent_at = None
            await message.save(
                update_fields=["status", "error_message", "sent_at", "last_attempt_at", "updated_at"]
            )
            failed += 1
            continue

        message.status = "sent"
        message.error_message = None
        message.sent_at = timezone.now()
        await message.save(
            update_fields=["status", "error_message", "sent_at", "last_attempt_at", "updated_at"]
        )
        sent += 1

    return {"processed": processed, "sent": sent, "failed": failed}


def continuous_mail_queue_worker(*, interval_seconds: float = 5.0, batch_size: int = 100) -> None:
    """Run the mail queue processor forever in a background daemon thread."""
    interval = _resolve_mail_worker_interval(interval_seconds)
    batch_size = max(1, int(batch_size))

    while True:
        try:
            result = async_to_sync(process_mail_queue)(limit=batch_size)
            if result.get("processed"):
                logger.info(
                    "[MAIL-QUEUE] Processed %(processed)s queued mail(s) "
                    "(%(sent)s sent, %(failed)s failed).",
                    result,
                )
        except Exception as exc:
            logger.warning("[MAIL-QUEUE] Worker cycle failed: %s", exc)
            sleep(interval)
            continue

        sleep(interval)


def start_mail_queue_thread(*, interval_seconds: float = 5.0, batch_size: int = 100) -> None:
    """Start the continuous mail queue worker once per process."""
    global _mail_worker_started
    with _mail_worker_lock:
        if _mail_worker_started:
            return
        _mail_worker_started = True

    thread = threading.Thread(
        target=continuous_mail_queue_worker,
        kwargs={"interval_seconds": interval_seconds, "batch_size": batch_size},
        name="mail-queue-worker",
        daemon=True,
    )
    thread.start()
