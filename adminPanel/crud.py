"""CRUD operations for adminPanel models including AdminUser and ClientUser."""

from adminPanel.models import (
    ActivityLog,
    AdminUser,
    ClientUser,
    PendingRequest,
)


# Admin User CRUD Operations
async def get_admin_user(user_id: int) -> AdminUser | None:
    """Get admin user by ID."""
    return await AdminUser.filter(id=user_id).first()


async def get_admin_users(skip: int = 0, limit: int = 100) -> list[AdminUser]:
    """Get list of system admin users."""
    return await AdminUser.all().offset(skip).limit(limit)


async def create_admin_user(
    name: str,
    email: str,
    role: str = "admin",
    department: str = "Operations",
    permissions: list[str] | None = None,
) -> AdminUser:
    """Create a new system admin user."""
    return await AdminUser.create(
        name=name,
        email=email,
        role=role,
        department=department,
        permissions=permissions or ["User Approvals", "View Reports"],
    )


# Client User CRUD Operations
async def get_client_user(user_id: int) -> ClientUser | None:
    """Get client user by ID."""
    return await ClientUser.filter(id=user_id).exclude(role__iexact="admin").first()


async def get_client_users(skip: int = 0, limit: int = 100) -> list[ClientUser]:
    """Get list of client users."""
    return await ClientUser.exclude(role__iexact="admin").offset(skip).limit(limit)


async def create_client_user(
    name: str,
    email: str,
    user_code: str | None = None,
    phone: str | None = None,
    country: str = "United States",
) -> ClientUser:
    """Create a new client user."""
    return await ClientUser.create(
        name=name,
        email=email,
        user_code=user_code,
        phone=phone,
        country=country,
        role="Client",
    )


async def get_pending_requests(skip: int = 0, limit: int = 100) -> list[PendingRequest]:
    """Get list of pending requests."""
    return await PendingRequest.all().offset(skip).limit(limit)


async def get_activity_logs(skip: int = 0, limit: int = 100) -> list[ActivityLog]:
    """Get list of activity logs."""
    return await ActivityLog.all().order_by("-timestamp").offset(skip).limit(limit)
