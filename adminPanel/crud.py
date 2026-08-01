"""CRUD operations for adminPanel models."""

from adminPanel.models import (
    ActivityLog,
    AdminUser,
    Investor,
    MamAccount,
    Manager,
    PendingRequest,
)


async def get_admin_user(user_id: int) -> AdminUser | None:
    """Get admin user by ID."""
    return await AdminUser.filter(id=user_id).first()


async def get_admin_users(skip: int = 0, limit: int = 100) -> list[AdminUser]:
    """Get list of admin users."""
    return await AdminUser.all().offset(skip).limit(limit)


async def create_admin_user(username: str, email: str, role: str = "Super Admin") -> AdminUser:
    """Create a new admin user."""
    return await AdminUser.create(username=username, email=email, role=role)


async def get_managers(skip: int = 0, limit: int = 100) -> list[Manager]:
    """Get list of managers."""
    return await Manager.all().offset(skip).limit(limit)


async def get_investors(skip: int = 0, limit: int = 100) -> list[Investor]:
    """Get list of investors."""
    return await Investor.all().offset(skip).limit(limit)


async def get_mam_accounts(skip: int = 0, limit: int = 100) -> list[MamAccount]:
    """Get list of MAM accounts."""
    return await MamAccount.all().offset(skip).limit(limit)


async def get_pending_requests(skip: int = 0, limit: int = 100) -> list[PendingRequest]:
    """Get list of pending requests."""
    return await PendingRequest.all().offset(skip).limit(limit)


async def get_activity_logs(skip: int = 0, limit: int = 100) -> list[ActivityLog]:
    """Get list of activity logs."""
    return await ActivityLog.all().offset(skip).limit(limit)
