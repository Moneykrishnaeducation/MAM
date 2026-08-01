"""Tests for Tortoise ORM models and CRUD operations in adminPanel and clientPanel."""

import pytest
from tortoise import Tortoise

from adminPanel import crud as admin_crud
from adminPanel.models import Investor, Manager
from clientPanel import crud as client_crud
from clientPanel.models import ClientAccount


@pytest.fixture(autouse=True)
async def initialize_tests():
    """Initialize Tortoise ORM for testing."""
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
            username="admin_test", email="admin@example.com", role="Super Admin"
        )
        assert admin.id is not None
        assert admin.username == "admin_test"
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
