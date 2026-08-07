"""Standalone terminal script to create or update an Admin / SuperAdmin user.

Usage:
    uv run python scripts/create_superuser.py
    uv run python scripts/create_superuser.py --name "Super Admin" --email "admin@mam.com" --password "Password123!" --role "SuperAdmin"
"""

from __future__ import annotations

import argparse
import asyncio
import getpass
import os
import sys
from pathlib import Path

# Ensure project root is in python path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Setup Django configuration before importing ORM models
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backendPanel.main")
import django  # noqa: E402

try:
    django.setup()
except Exception:
    pass

from adminPanel.management.commands.create_superuser import async_create_superuser  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Create or update a SuperAdmin / Admin user.")
    parser.add_argument("--name", type=str, help="Full name of the superuser")
    parser.add_argument("--email", type=str, help="Email address of the superuser")
    parser.add_argument("--password", type=str, help="Password for the superuser")
    parser.add_argument(
        "--role",
        type=str,
        default="SuperAdmin",
        choices=["SuperAdmin", "Admin", "Viewer"],
        help="Role for the account (Default: SuperAdmin)",
    )
    parser.add_argument("--phone", type=str, default="+1234567890", help="Phone number")

    args = parser.parse_args()

    email = args.email
    name = args.name
    password = args.password
    role = args.role
    phone = args.phone

    if not email:
        try:
            email = input("Enter Superuser Email [admin@mam.com]: ").strip()
        except EOFError:
            email = ""
        if not email:
            email = "admin@mam.com"

    if not name:
        try:
            name = input("Enter Superuser Name [Super Admin]: ").strip()
        except EOFError:
            name = ""
        if not name:
            name = "Super Admin"

    if not password:
        try:
            password = getpass.getpass("Enter Password: ").strip()
        except EOFError:
            password = ""

        if not password:
            print("ERROR: Password cannot be empty.", file=sys.stderr)
            sys.exit(1)

        try:
            confirm = getpass.getpass("Confirm Password: ").strip()
        except EOFError:
            confirm = ""

        if password != confirm:
            print("ERROR: Passwords do not match.", file=sys.stderr)
            sys.exit(1)

    try:
        user, created = asyncio.run(
            async_create_superuser(
                name=name,
                email=email,
                password=password,
                role=role,
                phone=phone,
            )
        )
        status_action = "Created new" if created else "Updated existing"
        print(f"\n[OK] {status_action} superuser successfully!")
        print(f"   * User ID  : {user.id}")
        print(f"   * Name     : {user.name}")
        print(f"   * Email    : {user.email}")
        print(f"   * Role     : {user.role}")
        print(f"   * Status   : {user.status}\n")
    except Exception as err:
        print(f"[ERROR] Failed to create superuser: {err}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
