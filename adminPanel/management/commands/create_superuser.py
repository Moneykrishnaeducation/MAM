"""Django management command to create or update an Admin/SuperAdmin user in terminal."""

from __future__ import annotations

import getpass
import sys

from asgiref.sync import async_to_sync
from django.core.management.base import BaseCommand

from adminPanel.models import AdminUser, ClientProfile, ClientUser
from backendPanel.database import ensure_db_initialized
from clientPanel.view.common import hash_client_password


async def async_create_superuser(
    name: str,
    email: str,
    password: str,
    role: str = "SuperAdmin",
    phone: str = "+1234567890",
) -> tuple[AdminUser, bool]:
    """Asynchronously create or update an AdminUser in admin_users table and sync to client_users."""
    await ensure_db_initialized()

    email_clean = email.strip().lower()
    pwd_hash = hash_client_password(password)

    # 1. Create or update in admin_users table (AdminUser model)
    admin_user = await AdminUser.filter(email=email_clean).first()
    created = False

    if admin_user:
        admin_user.name = name
        admin_user.password_hash = pwd_hash
        admin_user.role = role
        admin_user.status = "Active"
        await admin_user.save()
    else:
        admin_user = await AdminUser.create(
            name=name,
            email=email_clean,
            password_hash=pwd_hash,
            role=role,
            department="Operations",
            status="Active",
            permissions=["all"],
        )
        created = True

    # 2. Sync to client_users table (ClientUser model)
    client_user = await ClientUser.filter(email=email_clean).first()
    if client_user:
        client_user.name = name
        client_user.password_hash = pwd_hash
        client_user.role = role
        client_user.status = "Active"
        client_user.verified = True
        client_user.kyc_status = "Verified"
        if not client_user.phone and phone:
            client_user.phone = phone
        await client_user.save()
    else:
        count = await ClientUser.all().count()
        user_code = f"USR-{1000 + count + 1}"

        client_user = await ClientUser.create(
            user_code=user_code,
            name=name,
            email=email_clean,
            password_hash=pwd_hash,
            phone=phone,
            role=role,
            status="Active",
            verified=True,
            country="United States",
            tier="VIP Premium",
            kyc_status="Verified",
        )

    # Ensure profile exists for client_user
    profile = await ClientProfile.filter(user_id=client_user.id).first()
    if not profile:
        await ClientProfile.create(
            user_id=client_user.id,
            full_name=name,
            email=email_clean,
            phone=phone,
            country="United States",
            tier="VIP Premium",
            kyc_status="Verified",
        )
    else:
        profile.full_name = name
        profile.email = email_clean
        if not profile.phone and phone:
            profile.phone = phone
        await profile.save()

    return admin_user, created


class Command(BaseCommand):
    help = "Create or update a SuperAdmin / Admin user in the admin_users table."

    def add_arguments(self, parser):
        parser.add_argument("--name", type=str, help="Full name of the superuser")
        parser.add_argument("--email", type=str, help="Email address of the superuser")
        parser.add_argument("--password", type=str, help="Password for the superuser")
        parser.add_argument(
            "--role",
            type=str,
            default="SuperAdmin",
            choices=["SuperAdmin", "Admin", "Viewer"],
            help="Role for the superuser account (Default: SuperAdmin)",
        )
        parser.add_argument("--phone", type=str, default="+1234567890", help="Phone number")

    def handle(self, *args, **options):
        email = options.get("email")
        name = options.get("name")
        password = options.get("password")
        role = options.get("role") or "SuperAdmin"
        phone = options.get("phone") or "+1234567890"

        # Interactive prompts if arguments are missing
        if not email:
            try:
                email = input("Enter Superuser Email (default: admin@mam.com): ").strip()
            except EOFError:
                email = ""
            if not email:
                email = "admin@mam.com"

        if not name:
            try:
                name = input("Enter Superuser Name (default: Super Admin): ").strip()
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
                self.stderr.write(self.style.ERROR("Error: Password cannot be empty."))
                sys.exit(1)

            confirm_password = getpass.getpass("Confirm Password: ").strip()
            if password != confirm_password:
                self.stderr.write(self.style.ERROR("Error: Passwords do not match."))
                sys.exit(1)

        try:
            admin_user, created = async_to_sync(async_create_superuser)(
                name=name,
                email=email,
                password=password,
                role=role,
                phone=phone,
            )

            action_str = "Created new" if created else "Updated existing"
            self.stdout.write(
                self.style.SUCCESS(
                    f"\nSUCCESS: {action_str} superuser in admin_users table!\n"
                    f"  - Admin ID : {admin_user.id}\n"
                    f"  - Name     : {admin_user.name}\n"
                    f"  - Email    : {admin_user.email}\n"
                    f"  - Role     : {admin_user.role}\n"
                    f"  - Table    : admin_users\n"
                    f"  - Status   : {admin_user.status}\n"
                )
            )
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Failed to create superuser: {e}"))
            sys.exit(1)
