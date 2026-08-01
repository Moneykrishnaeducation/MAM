"""Models for clientPanel: Client User Profile, Trading Account Details, Investments, Transactions, Tickets."""

from tortoise import fields, models


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
    transaction_type = fields.CharField(max_length=50)  # Deposit / Withdrawal
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
