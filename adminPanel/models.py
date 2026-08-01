"""Models for adminPanel: Admin Users, Managers, Investors, MAM Accounts, Pending Requests, Activity Logs."""

from tortoise import fields, models


class AdminUser(models.Model):
    """Admin User model for system administrators."""

    id = fields.IntField(primary_key=True)
    username = fields.CharField(max_length=150, unique=True, index=True)
    email = fields.CharField(max_length=255, unique=True, index=True)
    role = fields.CharField(max_length=50, default="Super Admin")
    is_active = fields.BooleanField(default=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "admin_users"

    def __repr__(self) -> str:
        return f"<AdminUser(id={self.id}, username={self.username})>"


class Manager(models.Model):
    """MAM Manager model."""

    id = fields.IntField(primary_key=True)
    name = fields.CharField(max_length=255)
    email = fields.CharField(max_length=255, unique=True)
    strategy = fields.CharField(max_length=255, default="Quantitative Grid")
    performance_fee = fields.FloatField(default=20.0)
    total_aum = fields.FloatField(default=0.0)
    status = fields.CharField(max_length=50, default="Active")
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "admin_managers"


class Investor(models.Model):
    """Investor model managed in Admin Panel."""

    id = fields.IntField(primary_key=True)
    name = fields.CharField(max_length=255)
    email = fields.CharField(max_length=255, unique=True)
    equity = fields.FloatField(default=0.0)
    allocated_mam = fields.CharField(max_length=255, null=True)
    status = fields.CharField(max_length=50, default="Active")
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "admin_investors"


class MamAccount(models.Model):
    """MAM Account model."""

    id = fields.IntField(primary_key=True)
    account_number = fields.CharField(max_length=100, unique=True)
    broker = fields.CharField(max_length=100, default="Equinix Direct")
    master_strategy = fields.CharField(max_length=255)
    leverage = fields.CharField(max_length=20, default="1:500")
    total_balance = fields.FloatField(default=0.0)
    status = fields.CharField(max_length=50, default="Operational")
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "admin_mam_accounts"


class PendingRequest(models.Model):
    """Pending requests submitted for admin approval."""

    id = fields.IntField(primary_key=True)
    request_type = fields.CharField(max_length=100)
    client_name = fields.CharField(max_length=255)
    amount = fields.FloatField(default=0.0)
    status = fields.CharField(max_length=50, default="Pending")
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "admin_pending_requests"


class ActivityLog(models.Model):
    """System activity log entry."""

    id = fields.IntField(primary_key=True)
    action = fields.CharField(max_length=255)
    user_email = fields.CharField(max_length=255)
    ip_address = fields.CharField(max_length=50, default="127.0.0.1")
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "admin_activity_logs"
