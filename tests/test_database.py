"""Tests for Tortoise ORM models and CRUD operations in adminPanel and clientPanel."""

import json

import pytest
from django.conf import settings
from tortoise import Tortoise

from adminPanel import crud as admin_crud
from adminPanel.models import (
    ActivityLog,
    AdminUser,
    ClientProfile,
    ClientTicket,
    ClientTransaction,
    ClientUser,
    Investor,
    MamAccount,
    Manager,
    MyInvestment,
    PendingRequest,
)
from adminPanel.view.dashboard import get_admin_dashboard
from adminPanel.view.mam_accounts import create_mam_account
from adminPanel.view.pending_requests import (
    list_pending_banks,
    list_pending_cryptos,
    list_pending_deposits,
    list_pending_documents,
    list_pending_profiles,
    list_pending_requests,
    list_pending_requests_summary,
    list_pending_withdrawals,
)
from clientPanel import crud as client_crud
from clientPanel.models import ClientAccount
from clientPanel.view.common import create_client_login_token
from clientPanel.view.dashboard import get_client_dashboard
from clientPanel.view.deposit import create_client_deposit
from clientPanel.view.login import login_client
from clientPanel.view.profile import get_client_profile
from clientPanel.view.reset_password import reset_client_password
from clientPanel.view.tickets import create_client_ticket, get_client_ticket_detail
from clientPanel.view.withdrawal import create_client_withdrawal


@pytest.fixture(autouse=True)
async def initialize_tests():
    """Initialize Tortoise ORM for testing."""
    if not settings.configured:
        settings.configure(DEFAULT_CHARSET="utf-8")
    await Tortoise.init(
        db_url="sqlite://:memory:",
        modules={
            "models": [
                "adminPanel.models",
                "clientPanel.models",
            ]
        },
    )
    await Tortoise.generate_schemas()
    yield
    await Tortoise.close_connections()


class TestAdminPanelModels:
    """Tests for adminPanel models."""

    async def test_create_admin_user(self):
        """Test creating an admin user."""
        admin = await admin_crud.create_admin_user(
            name="Admin Test", email="admin@example.com", role="Super Admin"
        )
        assert admin.id is not None
        assert admin.name == "Admin Test"
        assert admin.email == "admin@example.com"
        assert admin.role == "Super Admin"

    async def test_create_manager_and_investor(self):
        """Test creating manager and investor."""
        manager = await Manager.create(
            name="Alpha Quant", email="quant@example.com", strategy="HFT Grid", total_aum=100000.0
        )
        assert manager.id is not None
        assert manager.name == "Alpha Quant"

        investor = await Investor.create(
            name="Alex Rivera", email="alex@example.com", equity=50000.0
        )
        assert investor.id is not None
        assert investor.equity == 50000.0

    async def test_create_mam_account(self):
        """Test creating a MAM account as an admin request."""
        request = type(
            "Request",
            (),
            {
                "method": "POST",
                "headers": {},
                "GET": {},
                "body": json.dumps(
                    {
                        "master_strategy": "Balanced Growth",
                        "broker": "Equinix Direct",
                        "total_balance": 150000.0,
                        "leverage": "1:500",
                        "status": "Operational",
                    }
                ).encode(),
                "user": type("User", (), {"is_authenticated": True, "is_staff": True})(),
            },
        )()

        response = await create_mam_account(request)
        payload = json.loads(response.content)

        assert response.status_code == 201
        assert payload["status"] == "ok"
        assert payload["mam_account"]["master_strategy"] == "Balanced Growth"
        assert payload["mam_account"]["account_number"].startswith("MAM-")

        saved = await MamAccount.get(master_strategy="Balanced Growth")
        assert saved.total_balance == 150000.0

    async def test_admin_dashboard(self):
        """Test admin dashboard summary payload and admin-only access."""
        await AdminUser.create(
            name="System Admin",
            email="system.admin@example.com",
            role="Super Admin",
            department="Operations",
        )
        await ClientUser.create(
            user_code="USR-DASH-A",
            name="Alex Rivera",
            email="alex.dash@example.com",
            country="United States",
        )
        await ClientUser.create(
            user_code="USR-DASH-B",
            name="Taylor Morgan",
            email="taylor.dash@example.com",
            country="Canada",
        )
        await Manager.create(
            name="Robert Vance",
            email="robert.vance@example.com",
            total_aum=123456.78,
        )
        await Investor.create(
            name="Elena Rostova",
            email="elena.dash@example.com",
            equity=50000.0,
        )
        await MamAccount.create(
            account_number="MAM-DASH-01",
            master_strategy="Balanced Growth",
            total_balance=222500.0,
            status="Operational",
        )
        await MamAccount.create(
            account_number="MAM-DASH-02",
            master_strategy="Conservative Income",
            total_balance=87500.0,
            status="Paused",
        )
        await PendingRequest.create(
            request_type="Withdrawal",
            client_name="Alex Rivera",
            amount=1250.0,
            status="Pending",
        )
        await ActivityLog.create(
            user_email="system.admin@example.com",
            action="Approved withdrawal",
            details="Approved withdrawal request #1",
            ip_address="127.0.0.1",
        )

        admin_request = type(
            "Request",
            (),
            {
                "method": "GET",
                "headers": {},
                "GET": {},
                "body": b"",
                "user": type(
                    "User",
                    (),
                    {"is_authenticated": True, "is_staff": True, "is_superuser": False},
                )(),
            },
        )()

        response = await get_admin_dashboard(admin_request)
        payload = json.loads(response.content)

        assert response.status_code == 200
        assert payload["status"] == "ok"
        assert len(payload["dashboard"]["cards"]) == 4
        assert payload["dashboard"]["cards"][0]["title"] == "Total MAM Investors"
        assert payload["dashboard"]["summary"]["admin_users"] == 1
        assert payload["dashboard"]["summary"]["investors"] == 1
        assert len(payload["dashboard"]["recent_registrations"]) == 2
        assert len(payload["dashboard"]["recent_requests"]) == 1
        assert len(payload["dashboard"]["recent_activity_logs"]) == 1

        denied_request = type(
            "Request",
            (),
            {
                "method": "GET",
                "headers": {},
                "GET": {},
                "body": b"",
            },
        )()

        denied_response = await get_admin_dashboard(denied_request)
        denied_payload = json.loads(denied_response.content)

        assert denied_response.status_code == 403
        assert denied_payload["status"] == "error"
        assert denied_payload["required_roles"] == ["admin"]

    async def test_admin_pending_request_tabs(self):
        """Test each pending-request tab endpoint and the admin permission guard."""
        pending_rows = [
            ("Deposit", "Alex Rivera", 1000.0),
            ("Deposit", "Elena Rostova", 2500.0),
            ("Deposit", "Michael Chen", 5000.0),
            ("Withdrawal", "Sarah Jenkins", 3500.0),
            ("Withdrawal", "Alex Rivera", 1200.0),
            ("Document Upload", "Michael Chen", 0.0),
            ("Document Upload", "Sarah Jenkins", 0.0),
            ("Profile Update", "Elena Rostova", 0.0),
            ("Profile Update", "Alex Rivera", 0.0),
            ("Bank Account", "Michael Chen", 0.0),
            ("Bank Account", "Elena Rostova", 0.0),
            ("Crypto Wallet", "Alex Rivera", 0.0),
            ("Crypto Wallet", "Sarah Jenkins", 0.0),
        ]
        for request_type, client_name, amount in pending_rows:
            await PendingRequest.create(
                request_type=request_type,
                client_name=client_name,
                amount=amount,
                status="Pending",
            )

        admin_request = type(
            "Request",
            (),
            {
                "method": "GET",
                "headers": {},
                "GET": {},
                "body": b"",
                "user": type(
                    "User",
                    (),
                    {"is_authenticated": True, "is_staff": True, "is_superuser": False},
                )(),
            },
        )()

        tab_expectations = [
            (list_pending_deposits, "deposits", 3),
            (list_pending_withdrawals, "withdrawals", 2),
            (list_pending_documents, "documents", 2),
            (list_pending_profiles, "profiles", 2),
            (list_pending_banks, "banks", 2),
            (list_pending_cryptos, "cryptos", 2),
        ]

        for view_func, tab_name, expected_count in tab_expectations:
            response = await view_func(admin_request)
            payload = json.loads(response.content)

            assert response.status_code == 200
            assert payload["status"] == "ok"
            assert payload["tab"] == tab_name
            assert payload["count"] == expected_count
            assert len(payload["requests"]) == expected_count

        combined_response = await list_pending_requests(admin_request)
        combined_payload = json.loads(combined_response.content)

        assert combined_response.status_code == 200
        assert combined_payload["status"] == "ok"
        assert len(combined_payload["requests"]) == 13

        summary_response = await list_pending_requests_summary(admin_request)
        summary_payload = json.loads(summary_response.content)

        assert summary_response.status_code == 200
        assert summary_payload["status"] == "ok"
        assert summary_payload["summary"] == {
            "deposits": 3,
            "withdrawals": 2,
            "documents": 2,
            "profiles": 2,
            "banks": 2,
            "cryptos": 2,
        }
        assert summary_payload["total"] == 13

        denied_request = type(
            "Request",
            (),
            {
                "method": "GET",
                "headers": {},
                "GET": {},
                "body": b"",
            },
        )()

        denied_response = await list_pending_deposits(denied_request)
        denied_payload = json.loads(denied_response.content)

        assert denied_response.status_code == 403
        assert denied_payload["status"] == "error"
        assert denied_payload["required_roles"] == ["admin"]


class TestClientPanelModels:
    """Tests for clientPanel models."""

    async def test_create_client_profile_and_account(self):
        """Test creating client profile and trading account."""
        profile = await client_crud.create_client_profile(
            user_id=101, full_name="Alex Rivera", email="alex.rivera@example.com"
        )
        assert profile.id is not None
        assert profile.full_name == "Alex Rivera"

        account = await ClientAccount.create(
            client_profile=profile,
            account_number="MT5-8849201",
            balance=45800.5,
            equity=47210.8,
        )
        assert account.id is not None
        assert account.account_number == "MT5-8849201"

    async def test_client_login_and_token_lookup(self):
        """Test client login response and token-based profile lookup."""
        user = await ClientUser.create(
            user_code="USR-LOGIN1",
            name="Alex Rivera",
            email="alex.login@example.com",
            country="United States",
        )
        profile = await ClientProfile.create(
            user_id=user.id,
            full_name="Alex Rivera",
            email="alex.login@example.com",
            country="United States",
        )

        request = type(
            "Request",
            (),
            {
                "method": "POST",
                "headers": {},
                "GET": {},
                "body": json.dumps(
                    {"email": "alex.login@example.com", "access_code": "USR-LOGIN1"}
                ).encode(),
            },
        )()

        response = await login_client(request)
        payload = json.loads(response.content)

        assert response.status_code == 200
        assert payload["status"] == "ok"
        assert payload["token_type"] == "Bearer"
        assert payload["client"]["id"] == user.id
        assert payload["profile"]["user_id"] == profile.user_id

        token_request = type(
            "Request",
            (),
            {
                "method": "GET",
                "headers": {"Authorization": f"Bearer {payload['token']}"},
                "GET": {},
                "body": b"",
            },
        )()

        profile_response = await get_client_profile(token_request)
        profile_payload = json.loads(profile_response.content)

        assert profile_response.status_code == 200
        assert profile_payload["status"] == "ok"
        assert profile_payload["profile"]["email"] == "alex.login@example.com"

    async def test_reset_client_password_by_email(self):
        """Test resetting a client password with email."""
        user = await ClientUser.create(
            user_code="USR-RESET1",
            name="Taylor Morgan",
            email="taylor.reset@example.com",
            country="United States",
        )
        await ClientProfile.create(
            user_id=user.id,
            full_name="Taylor Morgan",
            email="taylor.reset@example.com",
            country="United States",
        )

        request = type(
            "Request",
            (),
            {
                "method": "POST",
                "headers": {},
                "GET": {},
                "body": json.dumps(
                    {
                        "email": "taylor.reset@example.com",
                        "new_password": "NewPass123!",
                        "confirm_password": "NewPass123!",
                    }
                ).encode(),
            },
        )()

        response = await reset_client_password(request)
        payload = json.loads(response.content)

        assert response.status_code == 200
        assert payload["status"] == "ok"
        assert payload["email"] == "taylor.reset@example.com"

        refreshed = await ClientUser.get(email="taylor.reset@example.com")
        assert refreshed.password_hash

        login_request = type(
            "Request",
            (),
            {
                "method": "POST",
                "headers": {},
                "GET": {},
                "body": json.dumps(
                    {"email": "taylor.reset@example.com", "password": "NewPass123!"}
                ).encode(),
            },
        )()

        login_response = await login_client(login_request)
        login_payload = json.loads(login_response.content)

        assert login_response.status_code == 200
        assert login_payload["status"] == "ok"

    async def test_client_dashboard(self):
        """Test client dashboard cards and recent activity logs."""
        user = await ClientUser.create(
            user_code="USR-DASH1",
            name="Morgan Lee",
            email="morgan.dashboard@example.com",
            country="United States",
        )
        profile = await ClientProfile.create(
            user_id=user.id,
            full_name="Morgan Lee",
            email="morgan.dashboard@example.com",
            country="United States",
        )

        account = await ClientAccount.create(
            client_profile=profile,
            account_number="MT5-DASH-01",
            balance=125000.0,
            equity=131250.0,
        )
        assert account.id is not None
        await MyInvestment.create(
            client_profile=profile,
            strategy_name="Growth Blend",
            manager_name="Alpha Team",
            allocated_amount=42000.0,
            current_value=43800.0,
            return_pct=4.29,
        )
        await ClientTransaction.create(
            client_profile=profile,
            transaction_type="Deposit",
            amount=2500.0,
            payment_method="Wire Transfer",
            status="Completed",
        )
        await ClientTicket.create(
            client_profile=profile,
            subject="Login issue",
            priority="High",
            status="Open",
        )
        for idx in range(6):
            await ActivityLog.create(
                user_email=profile.email,
                action=f"activity-{idx}",
                details=f"Detail {idx}",
                ip_address="127.0.0.1",
            )

        request = type(
            "Request",
            (),
            {
                "method": "GET",
                "headers": {"Authorization": f"Bearer {create_client_login_token(user.id, user.email)}"},
                "GET": {},
                "body": b"",
            },
        )()

        response = await get_client_dashboard(request)
        payload = json.loads(response.content)

        assert response.status_code == 200
        assert payload["status"] == "ok"
        assert len(payload["dashboard"]["cards"]) == 4
        assert payload["dashboard"]["cards"][0]["key"] == "balance"
        assert len(payload["dashboard"]["recent_activity_logs"]) == 5

    async def test_client_deposit(self):
        """Test creating a client deposit request."""
        user = await ClientUser.create(
            user_code="USR-DEPOSIT1",
            name="Jamie Park",
            email="jamie.deposit@example.com",
            country="United States",
        )
        profile = await ClientProfile.create(
            user_id=user.id,
            full_name="Jamie Park",
            email="jamie.deposit@example.com",
            country="United States",
        )
        await ClientAccount.create(
            client_profile=profile,
            account_number="MT5-DEP-01",
            balance=2000.0,
            equity=2100.0,
        )

        request = type(
            "Request",
            (),
            {
                "method": "POST",
                "headers": {"Authorization": f"Bearer {create_client_login_token(user.id, user.email)}"},
                "GET": {},
                "body": json.dumps(
                    {
                        "account_number": "MT5-DEP-01",
                        "amount": 500.0,
                        "payment_method": "Wire Transfer",
                        "proof_name": "proof.pdf",
                    }
                ).encode(),
            },
        )()

        response = await create_client_deposit(request)
        payload = json.loads(response.content)

        assert response.status_code == 201
        assert payload["status"] == "ok"
        assert payload["deposit"]["amount"] == 500.0
        assert payload["deposit"]["status"] == "Pending"

        saved = await ClientTransaction.filter(client_profile_id=profile.id, transaction_type="Deposit").first()
        assert saved is not None
        assert saved.amount == 500.0
        assert saved.payment_method == "Wire Transfer"

    async def test_client_withdrawal(self):
        """Test creating a client withdrawal request."""
        user = await ClientUser.create(
            user_code="USR-WITHDRAW1",
            name="Jordan Kim",
            email="jordan.withdraw@example.com",
            country="United States",
        )
        profile = await ClientProfile.create(
            user_id=user.id,
            full_name="Jordan Kim",
            email="jordan.withdraw@example.com",
            country="United States",
        )
        await ClientAccount.create(
            client_profile=profile,
            account_number="MT5-WTH-01",
            balance=5000.0,
            equity=5100.0,
        )

        request = type(
            "Request",
            (),
            {
                "method": "POST",
                "headers": {"Authorization": f"Bearer {create_client_login_token(user.id, user.email)}"},
                "GET": {},
                "body": json.dumps(
                    {
                        "account_number": "MT5-WTH-01",
                        "amount": 250.0,
                        "payment_method": "Bank Transfer",
                        "destination_type": "bank",
                    }
                ).encode(),
            },
        )()

        response = await create_client_withdrawal(request)
        payload = json.loads(response.content)

        assert response.status_code == 201
        assert payload["status"] == "ok"
        assert payload["withdrawal"]["amount"] == 250.0
        assert payload["withdrawal"]["status"] == "Pending"

        saved = await ClientTransaction.filter(client_profile_id=profile.id, transaction_type="Withdrawal").first()
        assert saved is not None
        assert saved.amount == 250.0
        assert saved.payment_method == "Bank Transfer"

    async def test_client_ticket_create_and_detail(self):
        """Test creating and reading a client ticket for the logged-in user."""
        user = await ClientUser.create(
            user_code="USR-TICKET1",
            name="Casey Morgan",
            email="casey.ticket@example.com",
            country="United States",
        )
        profile = await ClientProfile.create(
            user_id=user.id,
            full_name="Casey Morgan",
            email="casey.ticket@example.com",
            country="United States",
        )

        create_request = type(
            "Request",
            (),
            {
                "method": "POST",
                "headers": {"Authorization": f"Bearer {create_client_login_token(user.id, user.email)}"},
                "GET": {},
                "body": json.dumps(
                    {
                        "subject": "Withdrawal delay inquiry",
                        "category": "Deposits & Withdrawals",
                        "priority": "High",
                        "description": "My withdrawal has been pending for two business days.",
                    }
                ).encode(),
            },
        )()

        create_response = await create_client_ticket(create_request)
        create_payload = json.loads(create_response.content)

        assert create_response.status_code == 201
        assert create_payload["status"] == "ok"
        assert create_payload["ticket"]["subject"] == "Withdrawal delay inquiry"
        assert create_payload["ticket"]["category"] == "Deposits & Withdrawals"
        assert create_payload["ticket"]["description"] == "My withdrawal has been pending for two business days."

        saved = await ClientTicket.filter(client_profile_id=profile.id).first()
        assert saved is not None

        detail_request = type(
            "Request",
            (),
            {
                "method": "GET",
                "headers": {"Authorization": f"Bearer {create_client_login_token(user.id, user.email)}"},
                "GET": {},
                "body": b"",
            },
        )()

        detail_response = await get_client_ticket_detail(detail_request, ticket_id=saved.id)
        detail_payload = json.loads(detail_response.content)

        assert detail_response.status_code == 200
        assert detail_payload["status"] == "ok"
        assert detail_payload["ticket"]["id"] == saved.id
        assert detail_payload["ticket"]["subject"] == "Withdrawal delay inquiry"

        other_user = await ClientUser.create(
            user_code="USR-TICKET2",
            name="Other Client",
            email="other.ticket@example.com",
            country="United States",
        )
        await ClientProfile.create(
            user_id=other_user.id,
            full_name="Other Client",
            email="other.ticket@example.com",
            country="United States",
        )

        forbidden_request = type(
            "Request",
            (),
            {
                "method": "GET",
                "headers": {"Authorization": f"Bearer {create_client_login_token(other_user.id, other_user.email)}"},
                "GET": {},
                "body": b"",
            },
        )()

        forbidden_response = await get_client_ticket_detail(forbidden_request, ticket_id=saved.id)
        forbidden_payload = json.loads(forbidden_response.content)

        assert forbidden_response.status_code == 404
        assert forbidden_payload["status"] == "error"
