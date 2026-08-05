"""Models for adminPanel: Users, TradingAccount (MAM + Investor unified), Pending Requests, Activity Logs, Client Profiles & Accounts."""

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
    full_name = fields.CharField(max_length=255, null=True)
    date_of_birth = fields.CharField(max_length=50, null=True)
    address = fields.CharField(max_length=255, null=True)
    city = fields.CharField(max_length=100, null=True)
    postal_code = fields.CharField(max_length=50, null=True)
    tier = fields.CharField(max_length=50, default="VIP Premium")
    kyc_status = fields.CharField(max_length=50, default="Verified")
    avatar = fields.CharField(max_length=500, null=True)
    last_login = fields.DatetimeField(null=True)
    joined = fields.DatetimeField(auto_now_add=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "client_users"

    def __repr__(self) -> str:
        return f"<ClientUser(id={self.id}, name={self.name}, email={self.email})>"


class TradingAccount(models.Model):
    """
    Unified trading account model for both MAM master accounts and investor accounts.

    account_type choices:
        - "MAM"      : MAM master / money-manager account
        - "Investor" : Investor (follower) account linked to a MAM master

    Self-referential FK:
        mam_master_account → points to the MAM master TradingAccount
        (null for MAM masters themselves).
    """

    # ── Identity ──────────────────────────────────────────────────────────
    id = fields.IntField(primary_key=True)
    account_id = fields.CharField(max_length=100)          # MT5 login number
    account_type = fields.CharField(max_length=20)         # "MAM" | "Investor"
    account_name = fields.CharField(max_length=255)

    # ── Owner ─────────────────────────────────────────────────────────────
    # Refers to the client user who owns this account
    user = fields.ForeignKeyField(
        "models.ClientUser",
        related_name="trading_accounts",
        on_delete=fields.CASCADE,
    )

    # ── MAM hierarchy ─────────────────────────────────────────────────────
    # Null for MAM masters; set for investor accounts
    mam_master_account = fields.ForeignKeyField(
        "models.TradingAccount",
        related_name="investor_accounts",
        null=True,
        on_delete=fields.SET_NULL,
    )

    # ── Approved by (admin user) ──────────────────────────────────────────
    approved_by = fields.ForeignKeyField(
        "models.AdminUser",
        related_name="approved_accounts",
        null=True,
        on_delete=fields.SET_NULL,
    )

    # ── Trading state ─────────────────────────────────────────────────────
    leverage = fields.IntField(default=100)
    is_enabled = fields.BooleanField(default=True)
    is_trading_enabled = fields.BooleanField(default=True)
    is_algo_enabled = fields.BooleanField(default=False)
    algo_enabled = fields.BooleanField(default=False)       # legacy alias
    is_pending = fields.BooleanField(default=False)

    # ── Financial snapshot (synced from MT5) ──────────────────────────────
    balance = fields.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    credit = fields.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    equity = fields.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    margin = fields.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    margin_free = fields.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    margin_level = fields.DecimalField(max_digits=12, decimal_places=2, default=0.00)


    # ── MAM / copy-trade configuration ────────────────────────────────────
    manager_allow_copy = fields.BooleanField(default=False)
    investor_allow_copy = fields.BooleanField(default=False)
    copy_trade_enabled = fields.BooleanField(default=False)
    dual_trade_enabled = fields.BooleanField(default=False)
    copy_mode = fields.CharField(max_length=20, null=True)          # e.g. "Fixed" | "Proportional"
    copy_factor = fields.DecimalField(max_digits=10, decimal_places=2, null=True)
    copy_multiplier_mode = fields.CharField(max_length=50, default="Fixed")
    fixed_copy_multiplier = fields.DecimalField(max_digits=10, decimal_places=2, default=1.00)
    max_copy_multiplier = fields.DecimalField(max_digits=10, decimal_places=2, default=1.00)
    multi_trade_count = fields.IntField(default=1, min_value=0)      # must be >= 0

    # ── Profit & risk ─────────────────────────────────────────────────────
    profit_sharing_percentage = fields.DecimalField(max_digits=5, decimal_places=2, null=True)
    risk_level = fields.CharField(max_length=10, null=True)         # e.g. "Low" | "Med" | "High"
    payout_frequency = fields.CharField(max_length=20, null=True)   # e.g. "Monthly"

    # ── Lifecycle timestamps ──────────────────────────────────────────────
    status = fields.CharField(max_length=20, null=True, default="Active")
    start_date = fields.DatetimeField(null=True)
    end_date = fields.DatetimeField(null=True)
    approved_at = fields.DatetimeField(null=True)
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "trading_accounts"

    def __repr__(self) -> str:
        return (
            f"<TradingAccount(id={self.id}, type={self.account_type}, "
            f"account_id={self.account_id}, name={self.account_name})>"
        )

    @property
    def is_mam_master(self) -> bool:
        """True when this account is a MAM master (manager) account."""
        return self.account_type == "MAM"

    @property
    def is_investor(self) -> bool:
        """True when this account belongs to an investor (follower)."""
        return self.account_type == "Investor"



class PendingRequest(models.Model):
    """Pending requests submitted for admin approval."""

    id = fields.IntField(primary_key=True)
    request_type = fields.CharField(max_length=100)
    client_name = fields.CharField(max_length=255)
    user = fields.ForeignKeyField(
        "models.ClientUser",
        related_name="pending_requests",
        null=True,
        on_delete=fields.SET_NULL,
    )
    amount = fields.FloatField(default=0.0)
    status = fields.CharField(max_length=50, default="Pending")
    payload = fields.JSONField(default=dict, null=True)
    reviewed_at = fields.DatetimeField(null=True)
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

class ClientDocument(models.Model):
    """Client identity and address documents."""

    id = fields.IntField(primary_key=True)
    user = fields.OneToOneField(
        "models.ClientUser",
        related_name="document_detail",
        on_delete=fields.CASCADE,
    )
    identity_file_name = fields.CharField(max_length=255, null=True)
    identity_file_path = fields.CharField(max_length=500, null=True)
    identity_status = fields.CharField(max_length=50, default="pending")
    identity_uploaded_at = fields.DatetimeField(null=True)
    address_file_name = fields.CharField(max_length=255, null=True)
    address_file_path = fields.CharField(max_length=500, null=True)
    address_status = fields.CharField(max_length=50, default="pending")
    address_uploaded_at = fields.DatetimeField(null=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "client_documents"

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


class ClientBankDetail(models.Model):
    """Client bank payment details used for funding and withdrawal requests."""

    id = fields.IntField(primary_key=True)
    user = fields.OneToOneField(
        "models.ClientUser",
        related_name="bank_detail",
        on_delete=fields.CASCADE,
    )
    account_holder = fields.CharField(max_length=255, null=True)
    bank_name = fields.CharField(max_length=255, default="")
    account_number = fields.CharField(max_length=100, default="")
    ifsc_swift = fields.CharField(max_length=100, default="")
    branch = fields.CharField(max_length=255, null=True)
    country = fields.CharField(max_length=100, default="United States")
    status = fields.CharField(max_length=50, default="pending")
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "client_bank_details"


class ClientCryptoDetail(models.Model):
    """Client crypto wallet details used for funding and withdrawal requests."""

    id = fields.IntField(primary_key=True)
    user = fields.OneToOneField(
        "models.ClientUser",
        related_name="crypto_detail",
        on_delete=fields.CASCADE,
    )
    network = fields.CharField(max_length=100, default="USDT-TRC20")
    wallet_address = fields.CharField(max_length=500, default="")
    currency = fields.CharField(max_length=50, default="USDT")
    status = fields.CharField(max_length=50, default="pending")
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "client_crypto_details"


class ClientAccount(models.Model):
    """Client Trading Account details model."""

    id = fields.IntField(primary_key=True)
    user = fields.ForeignKeyField("models.ClientUser", related_name="accounts")
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
    user = fields.ForeignKeyField("models.ClientUser", related_name="investments")
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
    user = fields.ForeignKeyField("models.ClientUser", related_name="transactions")
    account_number = fields.CharField(max_length=100, null=True)
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
    user = fields.ForeignKeyField("models.ClientUser", related_name="tickets")
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


class MT5SendDedup(models.Model):
    id = fields.IntField(primary_key=True)
    key = fields.CharField(max_length=255, unique=True, index=True)
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "mt5_send_dedup"


