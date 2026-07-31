"""Django's command-line utility for administrative tasks."""

import sys

from django.core.management import execute_from_command_line


def main():
    """Run administrative tasks."""
    # Importing app.main initializes Django settings and URLconf
    import app.main  # noqa: F401

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
