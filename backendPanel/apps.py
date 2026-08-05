"""AppConfig for backendPanel."""

import logging
import os
import sys

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class BackendPanelConfig(AppConfig):
    """Configuration for backendPanel app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "backendPanel"

    def ready(self):
        """Django app ready hook - launches background balance sync thread on startup."""
        is_server_process = (
            "runserver" in sys.argv
            or "uvicorn" in sys.argv
            or os.environ.get("RUN_MAIN") == "true"
            or os.environ.get("SERVER_SOFTWARE") is not None
            or any("main" in arg for arg in sys.argv)
        )
        if is_server_process:
            try:
                from adminPanel.view.balance_sync import start_balance_sync_thread

                logger.info("[STARTUP] Initializing MT5 Account Balance Sync thread via backendPanel.apps...")
                print("[STARTUP] Initializing MT5 Account Balance Sync thread via backendPanel.apps...")
                start_balance_sync_thread(interval_seconds=5.0)
            except Exception as e:
                logger.warning(f"Could not start balance sync thread in ready(): {e}")
