"""Seed or update a SuperAdmin record in the admin_users table."""

from __future__ import annotations

from getpass import getpass

from django.core.management.base import BaseCommand, CommandError
from asgiref.sync import async_to_sync

from adminPanel.models import AdminUser
from backendPanel.database import ensure_db_initialized
from clientPanel.view.common import hash_client_password


DEFAULT_PERMISSIONS = [
    "User Approvals",
    "View Reports",
    "Manage Admins",
    "Manage Settings",
    "Manage Users",
    "Manage Accounts",
]


class Command(BaseCommand):
    help = "Create or update a SuperAdmin user in the admin_users table."

    def add_arguments(self, parser):
        parser.add_argument("--name", help="Admin display name")
        parser.add_argument("--email", help="Admin email address")
        parser.add_argument("--password", help="Plain-text password to hash and store")
        parser.add_argument("--confirm-password", help="Confirm the plain-text password")
        parser.add_argument(
            "--role",
            choices=["Admin", "SuperAdmin", "Viewer"],
            default="SuperAdmin",
            help="Admin role to store on the record",
        )
        parser.add_argument(
            "--department",
            default="Operations",
            help="Department label to store on the admin record",
        )
        parser.add_argument(
            "--avatar",
            default="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80",
            help="Avatar URL to store on the admin record",
        )
        parser.add_argument(
            "--permissions",
            nargs="*",
            default=None,
            help="Optional list of permissions. Defaults to a SuperAdmin permission set.",
        )

    def handle(self, *args, **options):
        name = self._prompt_value(options.get("name"), "Name")
        email = self._prompt_value(options.get("email"), "Email").lower()
        password = self._prompt_password(options.get("password"), "Password")
        confirm_password = self._prompt_password(
            options.get("confirm_password") or options.get("confirm-password"),
            "Confirm password",
        )
        role = self._prompt_value(options.get("role"), "Role", default="SuperAdmin")
        department = str(options["department"]).strip() or "Operations"
        avatar = str(options["avatar"]).strip()
        permissions = options["permissions"] or DEFAULT_PERMISSIONS

        if not name:
            raise CommandError("Name is required")
        if not email:
            raise CommandError("Email is required")
        if not password:
            raise CommandError("Password is required")
        if password != confirm_password:
            raise CommandError("Password and confirm password do not match")

        self.stdout.write("Ensuring database is ready...")
        self._run_async(ensure_db_initialized())

        password_hash = hash_client_password(password)

        existing = self._run_async(AdminUser.filter(email=email).first())
        if existing:
            existing.name = name
            existing.role = role
            existing.department = department
            existing.permissions = permissions
            existing.status = "Active"
            existing.avatar = avatar
            existing.password_hash = password_hash
            self._run_async(existing.save())
            admin = existing
            action = "updated"
        else:
            admin = self._run_async(
                AdminUser.create(
                    name=name,
                    email=email,
                    role=role,
                    department=department,
                    permissions=permissions,
                    status="Active",
                    avatar=avatar,
                    password_hash=password_hash,
                )
            )
            action = "created"

        self.stdout.write(self.style.SUCCESS(
            f"SuperAdmin user {action} successfully: {admin.name} <{admin.email}>"
        ))
        self.stdout.write(f"Admin ID: ADM-{admin.id:03d}")
        self.stdout.write(f"Role: {admin.role}")

    def _prompt_value(self, provided: str | None, label: str, *, default: str | None = None) -> str:
        value = str(provided).strip() if provided is not None else ""
        if value:
            return value
        prompt = f"{label}"
        if default:
            prompt += f" [{default}]"
        prompt += ": "
        entered = input(prompt).strip()
        return entered or (default or "")

    def _prompt_password(self, provided: str | None, label: str) -> str:
        value = str(provided).strip() if provided is not None else ""
        if value:
            return value
        return getpass(f"{label}: ").strip()

    @staticmethod
    async def _await_coro(coro):
        return await coro

    def _run_async(self, coro):
        return async_to_sync(self._await_coro)(coro)
