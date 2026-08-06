"""Continuously process queued outbound mail messages."""

from __future__ import annotations

import time

from asgiref.sync import async_to_sync
from django.core.management.base import BaseCommand

from backendPanel.mail_queue import process_mail_queue


class Command(BaseCommand):
    help = "Continuously process queued mail messages in a separate worker process."

    def add_arguments(self, parser):
        parser.add_argument(
            "--interval",
            type=int,
            default=5,
            help="Polling interval in seconds between queue checks.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=100,
            help="Maximum queued messages to process per cycle.",
        )

    def handle(self, *args, **options):
        interval = max(1, int(options["interval"]))
        limit = max(1, int(options["limit"]))

        self.stdout.write(self.style.SUCCESS("Mail worker started. Press Ctrl+C to stop."))

        while True:
            result = async_to_sync(process_mail_queue)(limit=limit)
            if result["processed"] > 0:
                self.stdout.write(
                    f"Processed {result['processed']} queued mails "
                    f"({result['sent']} sent, {result['failed']} failed)"
                )
            time.sleep(interval)
