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
        """Django app ready hook."""
        pass
