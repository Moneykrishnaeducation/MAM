"""Models for adminPanel: Admin Users, Client Users, Managers, Investors, MAM Accounts, Pending Requests, Activity Logs, Client Profiles & Accounts."""

from tortoise import fields, models


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
    """Client User model for frontend client users management."""

    id = fields.IntField(primary_key=True)
    user_code = fields.CharField(max_length=50, unique=True, index=True, null=True)
    name = fields.CharField(max_length=255)
    email = fields.CharField(max_length=255, unique=True, index=True)
    phone = fields.CharField(max_length=50, null=True)
    role = fields.CharField(max_length=50, default="Client")
    status = fields.CharField(max_length=50, default="Active")
    verified = fields.BooleanField(default=True)
    country = fields.CharField(max_length=100, default="United States")
    avatar = fields.CharField(max_length=500, null=True)
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
    priority = fields.CharField(max_length=50, default="Normal")
    status = fields.CharField(max_length=50, default="Open")
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "client_tickets"
