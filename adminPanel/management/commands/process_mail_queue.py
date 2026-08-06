"""Process queued outbound mail messages."""

from __future__ import annotations

import time

from asgiref.sync import async_to_sync
from django.core.management.base import BaseCommand

from backendPanel.mail_queue import process_mail_queue


class Command(BaseCommand):
    help = "Send queued mail messages stored in the database."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=100, help="Maximum queued messages to send per run")
        parser.add_argument(
            "--watch",
            action="store_true",
            help="Keep polling the queue until interrupted.",
        )
        parser.add_argument(
            "--interval",
            type=int,
            default=5,
            help="Polling interval in seconds when --watch is enabled.",
        )

    def handle(self, *args, **options):
        limit = max(1, int(options["limit"]))
        watch = bool(options["watch"])
        interval = max(1, int(options["interval"]))

        while True:
            result = async_to_sync(process_mail_queue)(limit=limit)
            self.stdout.write(
                self.style.SUCCESS(
                    f"Processed {result['processed']} queued mails "
                    f"({result['sent']} sent, {result['failed']} failed)"
                )
            )
            if not watch:
                break
            time.sleep(interval)
