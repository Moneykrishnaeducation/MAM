"""Models for adminPanel: Users, Managers, Investors, MAM Accounts, Pending Requests, Activity Logs, Client Profiles & Accounts."""

import logging

from tortoise import fields, models

logger = logging.getLogger(__name__)

class AdminUser(models.Model):
    """Admin System User model for admin-users management."""

    id = fields.IntField(primary_key=True)
    name = fields.CharField(max_length=255)
    email = fields.CharField(max_length=255, unique=True, index=True)
    password_hash = fields.CharField(max_length=255, null=True)
    role = fields.CharField(max_length=100, default="Admin")
    department = fields.CharField(max_length=100, default="Operations")
    permissions = fields.JSONField(default=list)
    status = fields.CharField(max_length=50, default="Active")
    avatar = fields.CharField(max_length=500, null=True)
    last_login = fields.DatetimeField(null=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "admin_users"

    def __repr__(self) -> str:
        return f"<AdminUser(id={self.id}, name={self.name}, email={self.email})>"
class ClientUser(models.Model):
    """Unified user model for both admin and client records."""

    id = fields.IntField(primary_key=True)
    user_code = fields.CharField(max_length=50, unique=True, index=True, null=True)
    name = fields.CharField(max_length=255)
    email = fields.CharField(max_length=255, unique=True, index=True)
    password_hash = fields.CharField(max_length=255, null=True)
    phone = fields.CharField(max_length=50, null=True)
    role = fields.CharField(max_length=50, default="Client")
    department = fields.CharField(max_length=100, default="Operations")
    permissions = fields.JSONField(default=list)
    status = fields.CharField(max_length=50, default="Active")
    verified = fields.BooleanField(default=True)
    country = fields.CharField(max_length=100, default="United States")
    avatar = fields.CharField(max_length=500, null=True)
    last_login = fields.DatetimeField(null=True)
    joined = fields.DatetimeField(auto_now_add=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "client_users"

    def __repr__(self) -> str:
        return f"<ClientUser(id={self.id}, name={self.name}, email={self.email})>"


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
    account_number = fields.CharField(max_length=100, unique=True, null=True)
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
    user_email = fields.CharField(max_length=255)
    action = fields.CharField(max_length=255)
    details = fields.TextField(null=True)
    ip_address = fields.CharField(max_length=50)
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "admin_activity_logs"


class ClientProfile(models.Model):
    """Client Profile model for client user personal and KYC data."""

    id = fields.IntField(primary_key=True)
    user_id = fields.IntField(unique=True, index=True)
    full_name = fields.CharField(max_length=255)
    email = fields.CharField(max_length=255, unique=True, index=True)
    phone = fields.CharField(max_length=50, null=True)
    country = fields.CharField(max_length=100, default="United States")
    date_of_birth = fields.CharField(max_length=50, null=True)
    address = fields.CharField(max_length=255, null=True)
    city = fields.CharField(max_length=100, null=True)
    postal_code = fields.CharField(max_length=50, null=True)
    tier = fields.CharField(max_length=50, default="VIP Premium")
    kyc_status = fields.CharField(max_length=50, default="Verified")
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "client_profiles"

    def __repr__(self) -> str:
        return f"<ClientProfile(user_id={self.user_id}, name={self.full_name})>"


class ClientAccount(models.Model):
    """Client Trading Account details model."""

    id = fields.IntField(primary_key=True)
    client_profile = fields.ForeignKeyField("models.ClientProfile", related_name="accounts")
    account_number = fields.CharField(max_length=100, unique=True)
    server = fields.CharField(max_length=100, default="VTIndex-Live01")
    balance = fields.FloatField(default=0.0)
    equity = fields.FloatField(default=0.0)
    margin_free = fields.FloatField(default=0.0)
    leverage = fields.CharField(max_length=20, default="1:500")
    currency = fields.CharField(max_length=10, default="USD")
    status = fields.CharField(max_length=50, default="Active")
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "client_accounts"


class MyInvestment(models.Model):
    """Client MAM Investments allocation model."""

    id = fields.IntField(primary_key=True)
    client_profile = fields.ForeignKeyField("models.ClientProfile", related_name="investments")
    strategy_name = fields.CharField(max_length=255)
    manager_name = fields.CharField(max_length=255)
    allocated_amount = fields.FloatField(default=0.0)
    current_value = fields.FloatField(default=0.0)
    return_pct = fields.FloatField(default=0.0)
    status = fields.CharField(max_length=50, default="Active")
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "client_investments"


class ClientTransaction(models.Model):
    """Client Deposits & Withdrawals history model."""

    id = fields.IntField(primary_key=True)
    client_profile = fields.ForeignKeyField("models.ClientProfile", related_name="transactions")
    transaction_type = fields.CharField(max_length=50)
    amount = fields.FloatField(default=0.0)
    payment_method = fields.CharField(max_length=100, default="Wire Transfer")
    status = fields.CharField(max_length=50, default="Completed")
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "client_transactions"


class ClientTicket(models.Model):
    """Client Support Ticket model."""

    id = fields.IntField(primary_key=True)
    client_profile = fields.ForeignKeyField("models.ClientProfile", related_name="tickets")
    subject = fields.CharField(max_length=255)
    category = fields.CharField(max_length=100, default="General Question")
    priority = fields.CharField(max_length=50, default="Normal")
    status = fields.CharField(max_length=50, default="Open")
    description = fields.TextField(null=True)
    attachments = fields.JSONField(default=list, null=True)
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "client_tickets"


class ServerSetting(models.Model):
    id = fields.IntField(primary_key=True)
    server_ip = fields.CharField(max_length=512)
    real_account_login = fields.CharField(max_length=100)
    real_account_password = fields.CharField(max_length=512)
    server_name_client = fields.CharField(max_length=100)
    server_type = fields.BooleanField(default=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "mt5_serversetting"

    def __str__(self):
        return f"{self.server_name_client} ({self.server_ip})"

    def get_decrypted_server_ip(self):
        return self.server_ip

    def get_decrypted_real_account_password(self):
        return self.real_account_password


class MT5GroupConfig(models.Model):
    id = fields.IntField(primary_key=True)
    group_name = fields.CharField(max_length=255, unique=True)
    is_demo = fields.BooleanField(default=False)
    is_enabled = fields.BooleanField(default=True)
    leverage = fields.IntField(default=100)
    min_deposit = fields.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    description = fields.TextField(null=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    last_sync = fields.DatetimeField(null=True)

    class Meta:
        table = "mt5_group_config"

    def __str__(self):
        return f"{self.group_name} ({'Demo' if self.is_demo else 'Real'})"


class TradeGroup(models.Model):
    id = fields.IntField(primary_key=True)
    group_id = fields.CharField(max_length=100, unique=True, null=True)
    name = fields.CharField(max_length=100, unique=True)
    description = fields.TextField(null=True)
    alias = fields.CharField(max_length=100, null=True)
    type = fields.CharField(max_length=10, default="real")
    is_active = fields.BooleanField(default=True)
    is_default = fields.BooleanField(default=False)
    is_demo_default = fields.BooleanField(default=False)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "trade_groups"

    def __str__(self):
        return f"{self.name} ({self.type})"


