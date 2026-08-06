"""Tests for Tortoise ORM models and CRUD operations in adminPanel and clientPanel."""

import json
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import pytest
from django.conf import settings
from django.template.loader import render_to_string
from tortoise import Tortoise

from adminPanel import crud as admin_crud
from adminPanel.models import (
    ActivityLog,
    AdminMailMessage,
    AdminUser,
    ClientProfile,
    ClientDocument,
    ClientTicket,
    ClientTransaction,
    ClientUser,
    Investor,
    MamAccount,
    Manager,
    MyInvestment,
    PendingRequest,
)
from adminPanel.view.client_profile import update_client_profile
from adminPanel.view.client_tickets import list_client_tickets
from adminPanel.view.client_transactions import list_client_transactions
from adminPanel.view.dashboard import get_admin_dashboard
from adminPanel.view.mam_accounts import create_mam_account, _render_credentials_email_body
from adminPanel.view.pending_requests import (
    decide_pending_request,
    list_pending_banks,
    list_pending_cryptos,
    list_pending_deposits,
    list_pending_documents,
    list_pending_profiles,
    list_pending_requests,
    list_pending_requests_summary,
    list_pending_withdrawals,
)
from adminPanel.view.transactions import list_admin_transactions
from clientPanel import crud as client_crud
from clientPanel.models import ClientAccount
from clientPanel.view.common import create_client_login_token, hash_client_password
from clientPanel.view.dashboard import get_client_dashboard
from clientPanel.view.deposit import create_client_deposit
from clientPanel.view.account import create_client_trading_account
from clientPanel.view.documents import client_documents
from clientPanel.view.login import login_client
from clientPanel.view.profile import get_client_profile
from clientPanel.view.reset_password import request_client_password_reset, reset_client_password
from clientPanel.view.payment_details import client_payment_details
from clientPanel.view.tickets import create_client_ticket, get_client_ticket_detail
from clientPanel.view.withdrawal import create_client_withdrawal


@pytest.fixture(autouse=True)
async def initialize_tests():
    """Initialize Tortoise ORM for testing."""
    if not settings.configured:
        templates_dir = Path(__file__).resolve().parent.parent / "templates"
        settings.configure(
            DEFAULT_CHARSET="utf-8",
            TEMPLATES=[
                {
                    "BACKEND": "django.template.backends.django.DjangoTemplates",
                    "DIRS": [str(templates_dir)],
                    "APP_DIRS": True,
                    "OPTIONS": {
                        "context_processors": [],
                    },
                }
            ],
        )
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
        saved = await ClientUser.get(email="admin@example.com")
        assert saved.role == "Super Admin"

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

    async def test_mam_credentials_email_template(self):
        """Test the MAM credentials email template contains the account login and passwords."""
        subject, plain_body, html_body = _render_credentials_email_body(
            user_name="Taylor Morgan",
            account_type="MAM",
            login="12345678",
            group="MAM-Group",
            account_name="Taylor Morgan MAM Master",
            leverage=500,
            master_password="MasterPass123!",
            investor_password="InvestorPass123!",
        )

        assert subject == "MAM account credentials"
        assert "Taylor Morgan" in plain_body
        assert "12345678" in plain_body
        assert "MAM-Group" in plain_body
        assert "MasterPass123!" in plain_body
        assert "InvestorPass123!" in plain_body
        assert "Taylor Morgan MAM Master" in plain_body
        assert "Reset password" not in html_body
        assert "MasterPass123!" in html_body
        assert "InvestorPass123!" in html_body

    async def test_investor_credentials_email_template(self):
        """Test the investor credentials template renders the investor-specific layout."""
        context = {
            "user_name": "Taylor Morgan",
            "account_type": "Investor",
            "account_name": "Investor for MAM-001",
            "login": "12345679",
            "group": "INV-Group",
            "master_password": "MasterPass456!",
            "investor_password": "InvestorPass456!",
            "leverage": 200,
        }

        plain_body = render_to_string("emails/investor_credentials_email.txt", context)
        html_body = render_to_string("emails/investor_credentials_email.html", context)

        assert "Investor account credentials" not in plain_body
        assert "Taylor Morgan" in plain_body
        assert "12345679" in plain_body
        assert "INV-Group" in plain_body
        assert "MasterPass456!" in plain_body
        assert "InvestorPass456!" in plain_body
        assert "Go to Investor Dashboard" in html_body
        assert "MasterPass456!" in html_body
        assert "InvestorPass456!" in html_body

    async def test_deposit_notification_email_template(self):
        """Test the deposit notification template renders the key request fields."""
        context = {
            "user_name": "Jamie Park",
            "account_number": "MT5-DEP-01",
            "amount": "500.00",
            "payment_method": "Wire Transfer",
            "proof_name": "proof.pdf",
            "notes": "Deposit for trading",
            "status": "Pending",
            "created_at": "2026-08-06 11:00:00",
        }

        plain_body = render_to_string("emails/deposit_notification_email.txt", context)
        html_body = render_to_string("emails/deposit_notification_email.html", context)

        assert "Jamie Park" in plain_body
        assert "MT5-DEP-01" in plain_body
        assert "500.00" in plain_body
        assert "Wire Transfer" in plain_body
        assert "proof.pdf" in plain_body
        assert "View Deposit Status" in html_body

    async def test_withdrawal_notification_email_template(self):
        """Test the withdrawal notification template renders the key request fields."""
        context = {
            "user_name": "Jordan Kim",
            "account_number": "MT5-WTH-01",
            "amount": "250.00",
            "payment_method": "Bank Transfer",
            "destination_type": "bank",
            "notes": "Withdraw to bank",
            "status": "Pending",
            "created_at": "2026-08-06 11:05:00",
        }

        plain_body = render_to_string("emails/withdrawal_notification_email.txt", context)
        html_body = render_to_string("emails/withdrawal_notification_email.html", context)

        assert "Jordan Kim" in plain_body
        assert "MT5-WTH-01" in plain_body
        assert "250.00" in plain_body
        assert "Bank Transfer" in plain_body
        assert "bank" in plain_body
        assert "View Withdrawal Status" in html_body

    async def test_admin_approval_notification_email_template(self):
        """Test the admin approval notification template renders approval details."""
        context = {
            "title": "Deposit Approved",
            "user_name": "Jamie Park",
            "request_label": "deposit request",
            "details": [
                {"label": "Account Number", "value": "MT5-DEP-01"},
                {"label": "Amount", "value": "$500.00"},
                {"label": "Payment Method", "value": "Wire Transfer"},
            ],
            "reviewed_at": "2026-08-06 11:10:00",
            "approved_by": "System Admin",
        }

        plain_body = render_to_string("emails/admin_approval_notification.txt", context)
        html_body = render_to_string("emails/admin_approval_notification.html", context)

        assert "Jamie Park" in plain_body
        assert "deposit request" in plain_body
        assert "MT5-DEP-01" in plain_body
        assert "$500.00" in plain_body
        assert "Wire Transfer" in plain_body
        assert "Deposit Approved" in html_body
        assert "System Admin" in html_body

    async def test_admin_rejection_notification_email_template(self):
        """Test the admin rejection notification template renders rejection details."""
        context = {
            "title": "Withdrawal Rejected",
            "user_name": "Jordan Kim",
            "request_label": "withdrawal request",
            "details": [
                {"label": "Account Number", "value": "MT5-WTH-01"},
                {"label": "Amount", "value": "$250.00"},
                {"label": "Payment Method", "value": "Bank Transfer"},
            ],
            "reviewed_at": "2026-08-06 11:12:00",
            "approved_by": "System Admin",
            "reason": "Missing supporting documents",
        }

        plain_body = render_to_string("emails/admin_rejection_notification.txt", context)
        html_body = render_to_string("emails/admin_rejection_notification.html", context)

        assert "Jordan Kim" in plain_body
        assert "withdrawal request" in plain_body
        assert "MT5-WTH-01" in plain_body
        assert "$250.00" in plain_body
        assert "Missing supporting documents" in plain_body
        assert "Withdrawal Rejected" in html_body
        assert "System Admin" in html_body

    async def test_admin_update_approval_email_templates(self):
        """Test the profile, document, bank, and crypto approval templates render correctly."""
        cases = [
            (
                "emails/profile_update_approval_notification.txt",
                "emails/profile_update_approval_notification.html",
                {
                    "title": "Profile Update Approved",
                    "user_name": "Jamie Park",
                    "request_label": "profile update request",
                    "details": [{"label": "Full Name", "value": "Jamie Park"}],
                    "reviewed_at": "2026-08-06 11:15:00",
                    "approved_by": "System Admin",
                },
                "View Profile",
            ),
            (
                "emails/document_update_approval_notification.txt",
                "emails/document_update_approval_notification.html",
                {
                    "title": "Document Update Approved",
                    "user_name": "Jamie Park",
                    "request_label": "document request",
                    "details": [{"label": "Document Type", "value": "identity"}],
                    "reviewed_at": "2026-08-06 11:15:00",
                    "approved_by": "System Admin",
                },
                "View Documents",
            ),
            (
                "emails/bank_details_approval_notification.txt",
                "emails/bank_details_approval_notification.html",
                {
                    "title": "Bank Details Approved",
                    "user_name": "Jamie Park",
                    "request_label": "bank details request",
                    "details": [{"label": "Bank Name", "value": "ICICI"}],
                    "reviewed_at": "2026-08-06 11:15:00",
                    "approved_by": "System Admin",
                },
                "View Bank Details",
            ),
            (
                "emails/crypto_details_approval_notification.txt",
                "emails/crypto_details_approval_notification.html",
                {
                    "title": "Crypto Details Approved",
                    "user_name": "Jamie Park",
                    "request_label": "crypto details request",
                    "details": [{"label": "Network", "value": "USDT-TRC20"}],
                    "reviewed_at": "2026-08-06 11:15:00",
                    "approved_by": "System Admin",
                },
                "View Crypto Details",
            ),
        ]

        for plain_template, html_template, context, button_label in cases:
            plain_body = render_to_string(plain_template, context)
            html_body = render_to_string(html_template, context)
            assert context["user_name"] in plain_body
            assert context["title"] in plain_body
            assert context["request_label"] in plain_body
            assert button_label in html_body
            assert context["approved_by"] in html_body

    async def test_admin_dashboard(self):
        """Test admin dashboard summary payload and admin-only access."""
        await ClientUser.create(
            name="System Admin",
            email="system.admin@example.com",
            role="Admin",
            department="Operations",
            permissions=["View Reports", "User Approvals"],
            verified=True,
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

    async def test_admin_update_client_profile(self):
        """Test saving the admin users-page client profile modal."""
        user = await ClientUser.create(
            user_code="USR-PROFILE1",
            name="Jordan Doe",
            email="jordan.profile@example.com",
            phone="+1 555 0100",
            country="United States",
            avatar="https://example.com/old-avatar.png",
        )
        await ClientProfile.create(
            user_id=user.id,
            full_name="Jordan Doe",
            email="jordan.profile@example.com",
            phone="+1 555 0100",
            country="United States",
            tier="Standard",
            kyc_status="Pending",
        )

        request = type(
            "Request",
            (),
            {
                "method": "PUT",
                "headers": {},
                "GET": {},
                "body": json.dumps(
                    {
                        "name": "Jordan A. Doe",
                        "email": "jordan.profile@example.com",
                        "phone": "+1 555 0111",
                        "country": "Canada",
                        "dateOfBirth": "1990-01-15",
                        "address": "123 King Street",
                        "city": "Toronto",
                        "postalCode": "M5H 2N2",
                        "tier": "VIP",
                        "kycStatus": "Verified",
                        "avatar": "https://example.com/new-avatar.png",
                    }
                ).encode(),
                "user": type(
                    "User",
                    (),
                    {"is_authenticated": True, "is_staff": True, "is_superuser": False},
                )(),
            },
        )()

        response = await update_client_profile(request, user_id="USR-PROFILE1")
        payload = json.loads(response.content)

        assert response.status_code == 200
        assert payload["status"] == "ok"
        assert payload["user"]["name"] == "Jordan A. Doe"
        assert payload["profile"]["tier"] == "VIP"
        assert payload["profile"]["kyc_status"] == "Verified"
        assert payload["profile"]["dateOfBirth"] == "1990-01-15"

        refreshed_user = await ClientUser.get(id=user.id)
        refreshed_profile = await ClientProfile.get(user_id=user.id)
        assert refreshed_user.name == "Jordan A. Doe"
        assert refreshed_user.country == "Canada"
        assert refreshed_user.avatar == "https://example.com/new-avatar.png"
        assert refreshed_profile.address == "123 King Street"
        assert refreshed_profile.city == "Toronto"
        assert refreshed_profile.postal_code == "M5H 2N2"

    async def test_admin_client_kyc_payload(self):
        """Test loading KYC data for an admin users-page row from the database."""
        user = await ClientUser.create(
            user_code="USR-KYC100",
            name="Kyla Stone",
            email="kyla.kyc@example.com",
            phone="+1 555 0400",
            country="Canada",
            verified=True,
        )
        profile = await ClientProfile.create(
            user_id=user.id,
            full_name="Kyla Stone",
            email="kyla.kyc@example.com",
            phone="+1 555 0400",
            country="Canada",
            address="88 Queen Street",
            city="Toronto",
            postal_code="M5H 2N2",
            tier="VIP",
            kyc_status="Pending",
        )
        await ClientDocument.create(
            user_id=user.id,
            identity_file_name="passport.pdf",
            identity_file_path="/media/client_documents/kyla/passport.pdf",
            identity_status="approved",
            address_file_name="utility-bill.pdf",
            address_file_path="/media/client_documents/kyla/utility-bill.pdf",
            address_status="pending",
        )

        request = type(
            "Request",
            (object,),
            {
                "method": "GET",
                "headers": {},
                "GET": {},
                "body": b"",
                "user": type(
                    "User",
                    (object,),
                    {"is_authenticated": True, "is_staff": True, "is_superuser": False},
                )(),
            },
        )()

        from adminPanel.views import get_client_user_kyc, list_client_users

        response = await get_client_user_kyc(request, user_id="USR-KYC100")
        payload = json.loads(response.content)

        assert response.status_code == 200
        assert payload["status"] == "ok"
        assert payload["user"]["id"] == "USR-KYC100"
        assert payload["profile"]["kyc_status"] == "Pending"
        assert payload["document_detail"]["identity"]["file_name"] == "passport.pdf"
        assert payload["documents"]["identity"]["file_name"] == "passport.pdf"
        assert payload["documents"]["address"]["status"] == "pending"

        list_response = await list_client_users(request)
        list_payload = json.loads(list_response.content)
        user_row = next(row for row in list_payload["users"] if row["id"] == "USR-KYC100")

        assert user_row["kyc"]["status"] == "Pending"
        assert user_row["kyc"]["document_detail"]["identity"]["file_name"] == "passport.pdf"
        assert user_row["kyc"]["documents"]["identity"]["file_name"] == "passport.pdf"

    async def test_admin_client_transactions(self):
        """Test the admin client transaction history endpoint."""
        user = await ClientUser.create(
            user_code="USR-TX100",
            name="Casey Rivera",
            email="casey.tx@example.com",
            phone="+1 555 0200",
            country="United States",
        )
        profile = await ClientProfile.create(
            user_id=user.id,
            full_name="Casey Rivera",
            email="casey.tx@example.com",
            phone="+1 555 0200",
            country="United States",
            tier="VIP Premium",
            kyc_status="Verified",
        )
        await ClientTransaction.create(
            client_profile=profile,
            transaction_type="Deposit",
            amount=2500.0,
            payment_method="Wire Transfer",
            status="Completed",
        )
        await ClientTransaction.create(
            client_profile=profile,
            transaction_type="Withdrawal",
            amount=700.0,
            payment_method="Bank Transfer",
            status="Pending",
        )

        request = type(
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

        response = await list_client_transactions(request, user_id="USR-TX100")
        payload = json.loads(response.content)

        assert response.status_code == 200
        assert payload["status"] == "ok"
        assert payload["user"]["id"] == "USR-TX100"
        assert payload["summary"]["total_transactions"] == 2
        assert payload["summary"]["deposit_count"] == 1
        assert payload["summary"]["withdrawal_count"] == 1
        assert len(payload["transactions"]) == 2

        filtered_request = type(
            "Request",
            (),
            {
                "method": "GET",
                "headers": {},
                "GET": {"tab": "deposit"},
                "body": b"",
                "user": type(
                    "User",
                    (),
                    {"is_authenticated": True, "is_staff": True, "is_superuser": False},
                )(),
            },
        )()

        filtered_response = await list_client_transactions(filtered_request, user_id="USR-TX100")
        filtered_payload = json.loads(filtered_response.content)

        assert filtered_response.status_code == 200
        assert filtered_payload["tab"] == "deposit"
        assert len(filtered_payload["transactions"]) == 1
        assert filtered_payload["transactions"][0]["type"] == "Deposit"

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

        denied_response = await list_client_transactions(denied_request, user_id="USR-TX100")
        denied_payload = json.loads(denied_response.content)

        assert denied_response.status_code == 403
        assert denied_payload["status"] == "error"
        assert denied_payload["required_roles"] == ["admin"]

    async def test_admin_transactions_page_api(self):
        """Test the main admin transactions page endpoint."""
        user = await ClientUser.create(
            user_code="USR-ATX100",
            name="Taylor Grant",
            email="taylor.tx@example.com",
            phone="+1 555 0400",
            country="United States",
        )
        await ClientTransaction.create(
            user=user,
            account_number="ACC-1001",
            transaction_type="Deposit",
            amount=2500.0,
            payment_method="Wire Transfer",
            status="Completed",
        )
        await ClientTransaction.create(
            user=user,
            account_number="ACC-1001",
            transaction_type="Withdrawal",
            amount=700.0,
            payment_method="Bank Transfer",
            status="Pending",
        )
        await ClientTransaction.create(
            user=user,
            account_number="ACC-1001",
            account_id_from="ACC-0900",
            account_id_to="ACC-1001",
            transaction_type="Credit-In",
            amount=1500.0,
            payment_method="Admin Manual Adjustment",
            description="Internal transfer",
            status="Completed",
        )

        request = type(
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

        response = await list_admin_transactions(request)
        payload = json.loads(response.content)

        assert response.status_code == 200
        assert payload["status"] == "ok"
        assert payload["summary"]["total_transactions"] == 3
        assert payload["summary"]["deposit_count"] == 1
        assert payload["summary"]["withdrawal_count"] == 1
        assert payload["summary"]["internal_count"] == 1
        assert payload["summary"]["pending_count"] == 1
        assert len(payload["transactions"]) == 3
        assert payload["transactions"][0]["type"] in {"Deposit", "Withdraw", "Internal Transfer"}

        internal_request = type(
            "Request",
            (),
            {
                "method": "GET",
                "headers": {},
                "GET": {"tab": "internal"},
                "body": b"",
                "user": type(
                    "User",
                    (),
                    {"is_authenticated": True, "is_staff": True, "is_superuser": False},
                )(),
            },
        )()

        internal_response = await list_admin_transactions(internal_request)
        internal_payload = json.loads(internal_response.content)

        assert internal_response.status_code == 200
        assert internal_payload["tab"] == "internal"
        assert len(internal_payload["transactions"]) == 1
        assert internal_payload["transactions"][0]["type"] == "Internal Transfer"

    async def test_admin_client_tickets(self):
        """Test the admin client ticket history endpoint."""
        user = await ClientUser.create(
            user_code="USR-TICKET-ADMIN1",
            name="Robin Clarke",
            email="robin.ticket@example.com",
            phone="+1 555 0300",
            country="United States",
        )
        profile = await ClientProfile.create(
            user_id=user.id,
            full_name="Robin Clarke",
            email="robin.ticket@example.com",
            phone="+1 555 0300",
            country="United States",
            tier="VIP Premium",
            kyc_status="Verified",
        )
        await ClientTicket.create(
            client_profile=profile,
            subject="Verification pending",
            category="KYC",
            priority="High",
            status="Open",
            description="My verification document is still pending.",
        )
        await ClientTicket.create(
            client_profile=profile,
            subject="Login email update",
            category="Account",
            priority="Normal",
            status="Pending",
            description="Please update my login email.",
        )
        await ClientTicket.create(
            client_profile=profile,
            subject="Withdrawn case closed",
            category="Payments",
            priority="Low",
            status="Closed",
            description="The support case has been resolved.",
        )

        request = type(
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

        response = await list_client_tickets(request, user_id="USR-TICKET-ADMIN1")
        payload = json.loads(response.content)

        assert response.status_code == 200
        assert payload["status"] == "ok"
        assert payload["user"]["id"] == "USR-TICKET-ADMIN1"
        assert payload["summary"]["total_tickets"] == 3
        assert payload["summary"]["open_count"] == 1
        assert payload["summary"]["pending_count"] == 1
        assert payload["summary"]["closed_count"] == 1
        assert len(payload["tickets"]) == 3

        filtered_request = type(
            "Request",
            (),
            {
                "method": "GET",
                "headers": {},
                "GET": {"status": "pending"},
                "body": b"",
                "user": type(
                    "User",
                    (),
                    {"is_authenticated": True, "is_staff": True, "is_superuser": False},
                )(),
            },
        )()

        filtered_response = await list_client_tickets(filtered_request, user_id="USR-TICKET-ADMIN1")
        filtered_payload = json.loads(filtered_response.content)

        assert filtered_response.status_code == 200
        assert filtered_payload["status_filter"] == "pending"
        assert len(filtered_payload["tickets"]) == 1
        assert filtered_payload["tickets"][0]["subject"] == "Login email update"

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

        denied_response = await list_client_tickets(denied_request, user_id="USR-TICKET-ADMIN1")
        denied_payload = json.loads(denied_response.content)

        assert denied_response.status_code == 403
        assert denied_payload["status"] == "error"
        assert denied_payload["required_roles"] == ["admin"]

    async def test_admin_mail_draft_and_send(self, monkeypatch):
        """Test saving a mail draft and sending a composed admin email."""
        from adminPanel.view.mail import admin_mails

        draft_request = type(
            "Request",
            (),
            {
                "method": "POST",
                "headers": {},
                "GET": {},
                "body": json.dumps(
                    {
                        "to": ["client@example.com"],
                        "subject": "Draft update",
                        "body": "This is a draft.",
                        "send_now": False,
                    }
                ).encode(),
                "user": type(
                    "User",
                    (),
                    {"is_authenticated": True, "is_staff": True, "is_superuser": False},
                )(),
            },
        )()

        draft_response = await admin_mails(draft_request)
        draft_payload = json.loads(draft_response.content)

        assert draft_response.status_code == 201
        assert draft_payload["status"] == "ok"
        assert draft_payload["mail"]["status"] == "draft"

        saved_draft = await AdminMailMessage.get(subject="Draft update")
        assert saved_draft.status == "draft"

        send_request = type(
            "Request",
            (),
            {
                "method": "POST",
                "headers": {},
                "GET": {},
                "body": json.dumps(
                    {
                        "to": ["client@example.com"],
                        "subject": "Send update",
                        "body": "This is the sent email body.",
                        "html_body": "<p>This is the sent email body.</p>",
                        "send_now": True,
                    }
                ).encode(),
                "user": type(
                    "User",
                    (),
                    {"is_authenticated": True, "is_staff": True, "is_superuser": False},
                )(),
            },
        )()

        send_response = await admin_mails(send_request)
        send_payload = json.loads(send_response.content)

        assert send_response.status_code == 201
        assert send_payload["status"] == "ok"
        assert send_payload["mail"]["status"] == "queued"

        saved_sent = await AdminMailMessage.get(subject="Send update")
        assert saved_sent.status == "queued"
        assert saved_sent.queued_at is not None


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

    async def test_client_login_backfills_missing_profile(self):
        """Test that client login creates a missing profile when needed."""
        user = await ClientUser.create(
            user_code="USR-LOGIN2",
            name="Jamie Stone",
            email="jamie.login@example.com",
            country="Canada",
        )

        request = type(
            "Request",
            (),
            {
                "method": "POST",
                "headers": {},
                "GET": {},
                "body": json.dumps(
                    {"email": "jamie.login@example.com", "access_code": "USR-LOGIN2"}
                ).encode(),
            },
        )()

        response = await login_client(request)
        payload = json.loads(response.content)

        assert response.status_code == 200
        assert payload["status"] == "ok"
        profile = await ClientProfile.get(user_id=user.id)
        assert profile.full_name == "Jamie Stone"
        assert profile.email == "jamie.login@example.com"
        assert profile.country == "Canada"

    async def test_client_profile_update_sends_submission_email(self, monkeypatch):
        """Test submitting a profile edit triggers the profile request email."""
        from clientPanel.view import profile as profile_view

        user = await ClientUser.create(
            user_code="USR-PROFILE-SUB1",
            name="Jordan Lee",
            email="jordan.submit@example.com",
            phone="+1 555 0200",
            country="United States",
        )
        await ClientProfile.create(
            user_id=user.id,
            full_name="Jordan Lee",
            email="jordan.submit@example.com",
            phone="+1 555 0200",
            country="United States",
            tier="Standard",
            kyc_status="Pending",
        )

        captured = {}

        async def fake_send_profile_update_email(**kwargs):
            captured["email"] = kwargs["email"]
            captured["details"] = kwargs["details"]

        monkeypatch.setattr(
            profile_view, "_send_profile_update_email", fake_send_profile_update_email
        )

        request = type(
            "Request",
            (),
            {
                "method": "PUT",
                "headers": {
                    "Authorization": f"Bearer {create_client_login_token(user.id, user.email)}"
                },
                "GET": {},
                "body": json.dumps(
                    {
                        "name": "Jordan Lee",
                        "email": "jordan.submit@example.com",
                        "phone": "+1 555 0222",
                        "country": "Canada",
                    }
                ).encode(),
            },
        )()

        response = await get_client_profile(request)
        payload = json.loads(response.content)

        assert response.status_code == 200
        assert payload["status"] == "ok"
        assert payload["profile_request_status"] == "pending"
        assert captured["email"] == "jordan.submit@example.com"
        assert captured["details"]["Country"] == "Canada"

        pending_request = await PendingRequest.filter(
            user_id=user.id, request_type="profile"
        ).first()
        assert pending_request is not None
        assert pending_request.status == "Pending"

    async def test_client_identity_document_submission_sends_email(self, monkeypatch):
        """Test submitting an identity proof triggers the document submission email."""
        from clientPanel.view import documents as documents_view

        user = await ClientUser.create(
            user_code="USR-DOC1",
            name="Maya Singh",
            email="maya.doc@example.com",
            country="India",
        )
        await ClientProfile.create(
            user_id=user.id,
            full_name="Maya Singh",
            email="maya.doc@example.com",
            country="India",
        )

        captured = {}

        async def fake_send_document_submission_email(**kwargs):
            captured["email"] = kwargs["email"]
            captured["document_type"] = kwargs["document_type"]
            captured["details"] = kwargs["details"]

        monkeypatch.setattr(
            documents_view, "_send_document_submission_email", fake_send_document_submission_email
        )
        monkeypatch.setattr(
            documents_view,
            "_save_uploaded_document",
            lambda uploaded_file, profile_id, document_type: (
                f"client_documents/{profile_id}/{document_type}/identity.pdf",
                "https://example.com/identity.pdf",
            ),
        )

        fake_file = type(
            "File", (), {"name": "identity.pdf", "content_type": "application/pdf", "size": 1234}
        )()
        request = type(
            "Request",
            (),
            {
                "method": "POST",
                "headers": {
                    "Authorization": f"Bearer {create_client_login_token(user.id, user.email)}"
                },
                "GET": {},
                "POST": {},
                "FILES": {"documentFile": fake_file},
                "body": json.dumps({"documentType": "identity"}).encode(),
            },
        )()

        response = await client_documents(request)
        payload = json.loads(response.content)

        assert response.status_code == 200
        assert payload["status"] == "ok"
        assert captured["email"] == "maya.doc@example.com"
        assert captured["document_type"] == "identity"
        assert captured["details"]["Document Type"] == "Identity Proof"

        pending_request = await PendingRequest.filter(
            user_id=user.id, request_type="documents"
        ).first()
        assert pending_request is not None
        assert pending_request.payload["document_type"] == "identity"

    async def test_client_payment_submission_sends_email(self, monkeypatch):
        """Test submitting bank and crypto payment details triggers the payment email."""
        from clientPanel.view import payment_details as payment_view

        user = await ClientUser.create(
            user_code="USR-PAY1",
            name="Noah Patel",
            email="noah.pay@example.com",
            country="United States",
        )
        await ClientProfile.create(
            user_id=user.id,
            full_name="Noah Patel",
            email="noah.pay@example.com",
            country="United States",
        )

        captured: dict[str, dict] = {}

        async def fake_send_payment_submission_email(**kwargs):
            captured["email"] = kwargs["email"]
            captured["payment_type"] = kwargs["payment_type"]
            captured["details"] = kwargs["details"]

        monkeypatch.setattr(
            payment_view, "_send_payment_submission_email", fake_send_payment_submission_email
        )

        bank_request = type(
            "Request",
            (),
            {
                "method": "PUT",
                "headers": {
                    "Authorization": f"Bearer {create_client_login_token(user.id, user.email)}"
                },
                "GET": {},
                "body": json.dumps(
                    {
                        "paymentType": "bank",
                        "accountHolder": "Noah Patel",
                        "bankName": "First National",
                        "accountNumber": "1234567890",
                        "ifscSwift": "FNINUS33",
                        "branch": "Downtown",
                        "country": "United States",
                    }
                ).encode(),
            },
        )()

        bank_response = await client_payment_details(bank_request)
        bank_payload = json.loads(bank_response.content)

        assert bank_response.status_code == 200
        assert bank_payload["status"] == "ok"
        assert captured["email"] == "noah.pay@example.com"
        assert captured["payment_type"] == "bank"
        assert captured["details"]["Bank Name"] == "First National"

        crypto_request = type(
            "Request",
            (),
            {
                "method": "PUT",
                "headers": {
                    "Authorization": f"Bearer {create_client_login_token(user.id, user.email)}"
                },
                "GET": {},
                "body": json.dumps(
                    {
                        "paymentType": "crypto",
                        "network": "USDT-TRC20",
                        "cryptoAddress": "TRC20-WALLET-123",
                        "cryptoCurrency": "USDT",
                    }
                ).encode(),
            },
        )()

        crypto_response = await client_payment_details(crypto_request)
        crypto_payload = json.loads(crypto_response.content)

        assert crypto_response.status_code == 200
        assert crypto_payload["status"] == "ok"
        assert captured["payment_type"] == "crypto"
        assert captured["details"]["Wallet Address"] == "TRC20-WALLET-123"

        bank_pending = await PendingRequest.filter(user_id=user.id, request_type="bank").first()
        crypto_pending = await PendingRequest.filter(user_id=user.id, request_type="crypto").first()
        assert bank_pending is not None
        assert crypto_pending is not None

    async def test_client_activity_logs_use_authenticated_user_id(self):
        """Test client activity logs are fetched for the logged-in client user."""
        user = await ClientUser.create(
            user_code="USR-ACT1",
            name="Morgan Lane",
            email="morgan.activity@example.com",
            country="United States",
        )
        other_user = await ClientUser.create(
            user_code="USR-ACT2",
            name="Taylor Reed",
            email="taylor.activity@example.com",
            country="United States",
        )

        await ActivityLog.create(
            user_email=user.email,
            user_name=user.name,
            user_role="Client",
            action_type="Login",
            module_name="Authentication",
            user_id=user.id,
        )
        await ActivityLog.create(
            user_email=other_user.email,
            user_name=other_user.name,
            user_role="Client",
            action_type="Login",
            module_name="Authentication",
            user_id=other_user.id,
        )

        request = type(
            "Request",
            (),
            {
                "method": "GET",
                "headers": {
                    "Authorization": f"Bearer {create_client_login_token(user.id, user.email)}"
                },
                "GET": {},
                "body": b"",
            },
        )()

        response = await get_client_activity_logs(request)
        payload = json.loads(response.content)

        assert response.status_code == 200
        assert payload["status"] == "ok"
        assert len(payload["activity_logs"]) == 1
        assert payload["activity_logs"][0]["user_name"] == "Morgan Lane"

    async def test_client_mam_account_creation_sends_credentials_email(self, monkeypatch):
        """Test client-side MAM account creation sends the credential email."""
        user = await ClientUser.create(
            user_code="USR-MAM1",
            name="Jamie Stone",
            email="jamie.mam@example.com",
            country="United States",
        )
        await ClientProfile.create(
            user_id=user.id,
            full_name="Jamie Stone",
            email="jamie.mam@example.com",
            country="United States",
        )

        account = await TradingAccount.create(
            account_id="99887766",
            account_type="MAM",
            account_name="Jamie Stone MAM Master",
            user=user,
            leverage=500,
            is_enabled=True,
            is_trading_enabled=True,
            is_algo_enabled=False,
            algo_enabled=False,
            is_pending=False,
            manager_allow_copy=True,
            investor_allow_copy=False,
            copy_trade_enabled=False,
            dual_trade_enabled=False,
            copy_multiplier_mode="Fixed",
            fixed_copy_multiplier=1,
            max_copy_multiplier=1,
            multi_trade_count=1,
            status="Active",
        )

        captured: dict[str, str] = {}

        class FakeMT5:
            connection_error = None

            def create_mam_account(self, **kwargs):
                return {
                    "login": "99887766",
                    "group": "MAM-Group",
                    "master_password": "MasterPass123!",
                    "investor_password": "InvestorPass123!",
                    "trading_account_id": account.id,
                }

        async def fake_send_credentials_email(**kwargs):
            captured["email"] = kwargs["user"].email
            captured["login"] = str(kwargs["login"])
            captured["group"] = kwargs["group"]

        monkeypatch.setattr("clientPanel.view.account.MT5ManagerActions", FakeMT5)
        monkeypatch.setattr(
            "clientPanel.view.account._send_credentials_email", fake_send_credentials_email
        )

        request = type(
            "Request",
            (),
            {
                "method": "POST",
                "headers": {
                    "Authorization": f"Bearer {create_client_login_token(user.id, user.email)}"
                },
                "GET": {},
                "body": json.dumps(
                    {
                        "type": "manager",
                        "accountName": "Jamie Stone MAM Master",
                        "leverage": "500x",
                        "masterPassword": "MasterPass123!",
                        "investorPassword": "InvestorPass123!",
                    }
                ).encode(),
            },
        )()

        response = await create_client_trading_account(request)
        payload = json.loads(response.content)

        assert response.status_code == 200
        assert payload["status"] == "ok"
        assert captured["email"] == "jamie.mam@example.com"
        assert captured["login"] == "99887766"
        assert captured["group"] == "MAM-Group"

    async def test_admin_login_and_dashboard_token_lookup(self):
        """Test admin login response and bearer-token access to the admin dashboard."""
        admin_user = await ClientUser.create(
            name="Root Admin",
            email="root.admin@example.com",
            password_hash=hash_client_password("Admin@2026!"),
            role="Admin",
            department="Operations",
            permissions=["User Approvals", "View Reports"],
            status="Active",
            verified=True,
        )

        login_request = type(
            "Request",
            (object,),
            {
                "method": "POST",
                "headers": {},
                "GET": {},
                "body": json.dumps(
                    {"email": "root.admin@example.com", "password": "Admin@2026!"}
                ).encode(),
            },
        )()

        login_response = await login_client(login_request)
        login_payload = json.loads(login_response.content)

        assert login_response.status_code == 200
        assert login_payload["status"] == "ok"
        assert login_payload["role"] == "Admin"
        assert login_payload["admin"]["id"] == admin_user.id

        dashboard_request = type(
            "Request",
            (object,),
            {
                "method": "GET",
                "headers": {"Authorization": f"Bearer {login_payload['token']}"},
                "GET": {},
                "body": b"",
            },
        )()

        dashboard_response = await get_admin_dashboard(dashboard_request)
        dashboard_payload = json.loads(dashboard_response.content)

        assert dashboard_response.status_code == 200
        assert dashboard_payload["status"] == "ok"
        assert "dashboard" in dashboard_payload

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

    async def test_client_password_reset_link_flow(self, monkeypatch):
        """Test requesting a reset link and using it to set a new password."""
        user = await ClientUser.create(
            user_code="USR-RESET2",
            name="Jordan Pike",
            email="jordan.reset@example.com",
            country="United States",
        )
        await ClientProfile.create(
            user_id=user.id,
            full_name="Jordan Pike",
            email="jordan.reset@example.com",
            country="United States",
        )

        captured: dict[str, str] = {}

        async def fake_send_password_reset_email(target_user, reset_url):
            captured["email"] = target_user.email
            captured["reset_url"] = reset_url

        monkeypatch.setattr(
            "clientPanel.view.reset_password._send_password_reset_email",
            fake_send_password_reset_email,
        )

        request = type(
            "Request",
            (),
            {
                "method": "POST",
                "headers": {},
                "GET": {},
                "body": json.dumps({"email": "jordan.reset@example.com"}).encode(),
                "build_absolute_uri": lambda self, path: f"https://example.com{path}",
            },
        )()

        response = await request_client_password_reset(request)
        payload = json.loads(response.content)

        assert response.status_code == 200
        assert payload["status"] == "ok"
        assert captured["email"] == "jordan.reset@example.com"

        reset_link = captured["reset_url"]
        parsed = urlparse(reset_link)
        token = parse_qs(parsed.query)["token"][0]

        reset_request = type(
            "Request",
            (),
            {
                "method": "POST",
                "headers": {},
                "GET": {},
                "body": json.dumps(
                    {
                        "token": token,
                        "new_password": "TokenPass123!",
                        "confirm_password": "TokenPass123!",
                    }
                ).encode(),
            },
        )()

        reset_response = await reset_client_password(reset_request)
        reset_payload = json.loads(reset_response.content)

        assert reset_response.status_code == 200
        assert reset_payload["status"] == "ok"

        login_request = type(
            "Request",
            (),
            {
                "method": "POST",
                "headers": {},
                "GET": {},
                "body": json.dumps(
                    {"email": "jordan.reset@example.com", "password": "TokenPass123!"}
                ).encode(),
            },
        )()

        login_response = await login_client(login_request)
        login_payload = json.loads(login_response.content)

        assert login_response.status_code == 200
        assert login_payload["status"] == "ok"

    async def test_password_reset_requests_role_when_email_exists_in_both_tables(self, monkeypatch):
        """Test the reset request asks the user to choose a role when the email exists in both tables."""
        await AdminUser.create(
            name="Shared Admin",
            email="shared@example.com",
            password_hash=hash_client_password("AdminPass123!"),
            role="Admin",
            department="Operations",
            status="Active",
        )
        await ClientUser.create(
            user_code="USR-SHARED1",
            name="Shared Client",
            email="shared@example.com",
            country="United States",
        )

        captured: dict[str, str] = {}

        async def fake_send_password_reset_email(target_user, reset_url):
            captured["email"] = target_user.email
            captured["reset_url"] = reset_url

        monkeypatch.setattr(
            "clientPanel.view.reset_password._send_password_reset_email",
            fake_send_password_reset_email,
        )

        request = type(
            "Request",
            (),
            {
                "method": "POST",
                "headers": {},
                "GET": {},
                "body": json.dumps({"email": "shared@example.com"}).encode(),
                "build_absolute_uri": lambda self, path: f"https://example.com{path}",
            },
        )()

        response = await request_client_password_reset(request)
        payload = json.loads(response.content)

        assert response.status_code == 200
        assert payload["status"] == "needs_role_selection"
        assert {role["value"] for role in payload["roles"]} == {"admin", "client"}
        assert captured == {}

        admin_choice_request = type(
            "Request",
            (),
            {
                "method": "POST",
                "headers": {},
                "GET": {},
                "body": json.dumps(
                    {
                        "email": "shared@example.com",
                        "user_type": "admin",
                    }
                ).encode(),
                "build_absolute_uri": lambda self, path: f"https://example.com{path}",
            },
        )()

        admin_choice_response = await request_client_password_reset(admin_choice_request)
        admin_choice_payload = json.loads(admin_choice_response.content)

        assert admin_choice_response.status_code == 200
        assert admin_choice_payload["status"] == "ok"
        assert captured["email"] == "shared@example.com"

    async def test_admin_password_reset_link_flow(self, monkeypatch):
        """Test requesting a reset link for an admin account and using it to set a new password."""
        admin_user = await AdminUser.create(
            name="System Admin",
            email="system.admin@example.com",
            password_hash=hash_client_password("OldAdmin123!"),
            role="Admin",
            department="Operations",
            status="Active",
        )

        captured: dict[str, str] = {}

        async def fake_send_password_reset_email(target_user, reset_url):
            captured["email"] = target_user.email
            captured["reset_url"] = reset_url

        monkeypatch.setattr(
            "clientPanel.view.reset_password._send_password_reset_email",
            fake_send_password_reset_email,
        )

        request = type(
            "Request",
            (),
            {
                "method": "POST",
                "headers": {},
                "GET": {},
                "body": json.dumps({"email": "system.admin@example.com"}).encode(),
                "build_absolute_uri": lambda self, path: f"https://example.com{path}",
            },
        )()

        response = await request_client_password_reset(request)
        payload = json.loads(response.content)

        assert response.status_code == 200
        assert payload["status"] == "ok"
        assert captured["email"] == "system.admin@example.com"

        reset_link = captured["reset_url"]
        parsed = urlparse(reset_link)
        token = parse_qs(parsed.query)["token"][0]

        reset_request = type(
            "Request",
            (),
            {
                "method": "POST",
                "headers": {},
                "GET": {},
                "body": json.dumps(
                    {
                        "token": token,
                        "new_password": "NewAdmin123!",
                        "confirm_password": "NewAdmin123!",
                    }
                ).encode(),
            },
        )()

        reset_response = await reset_client_password(reset_request)
        reset_payload = json.loads(reset_response.content)

        assert reset_response.status_code == 200
        assert reset_payload["status"] == "ok"
        refreshed_admin = await AdminUser.get(email="system.admin@example.com")
        assert refreshed_admin.password_hash != admin_user.password_hash

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
                "headers": {
                    "Authorization": f"Bearer {create_client_login_token(user.id, user.email)}"
                },
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

    async def test_client_deposit(self, monkeypatch):
        """Test creating a client deposit request."""
        from clientPanel.view import deposit as deposit_view

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
                "headers": {
                    "Authorization": f"Bearer {create_client_login_token(user.id, user.email)}"
                },
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

        called = {}

        async def fake_send_deposit_email(**kwargs):
            called["email"] = kwargs["email"]
            called["account_number"] = kwargs["account_number"]

        monkeypatch.setattr(deposit_view, "_send_deposit_email", fake_send_deposit_email)

        response = await create_client_deposit(request)
        payload = json.loads(response.content)

        assert response.status_code == 201
        assert payload["status"] == "ok"
        assert payload["deposit"]["amount"] == 500.0
        assert payload["deposit"]["status"] == "Pending"

        saved = await ClientTransaction.filter(
            client_profile_id=profile.id, transaction_type="Deposit"
        ).first()
        assert saved is not None
        assert saved.amount == 500.0
        assert saved.payment_method == "Wire Transfer"
        assert called["email"] == "jamie.deposit@example.com"
        assert called["account_number"] == "MT5-DEP-01"

    async def test_client_withdrawal(self, monkeypatch):
        """Test creating a client withdrawal request."""
        from clientPanel.view import withdrawal as withdrawal_view

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
                "headers": {
                    "Authorization": f"Bearer {create_client_login_token(user.id, user.email)}"
                },
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

        called = {}

        async def fake_send_withdrawal_email(**kwargs):
            called["email"] = kwargs["email"]
            called["account_number"] = kwargs["account_number"]

        monkeypatch.setattr(withdrawal_view, "_send_withdrawal_email", fake_send_withdrawal_email)

        response = await create_client_withdrawal(request)
        payload = json.loads(response.content)

        assert response.status_code == 201
        assert payload["status"] == "ok"
        assert payload["withdrawal"]["amount"] == 250.0
        assert payload["withdrawal"]["status"] == "Pending"

        saved = await ClientTransaction.filter(
            client_profile_id=profile.id, transaction_type="Withdrawal"
        ).first()
        assert saved is not None
        assert saved.amount == 250.0
        assert saved.payment_method == "Bank Transfer"
        assert called["email"] == "jordan.withdraw@example.com"
        assert called["account_number"] == "MT5-WTH-01"

    async def test_admin_approves_deposit_request_sends_email(self, monkeypatch):
        """Test approving a deposit request sends the approval email to the client."""
        from adminPanel.view import pending_requests as pending_view

        user = await ClientUser.create(
            user_code="USR-APPROVE1",
            name="Jamie Park",
            email="jamie.approve@example.com",
            country="United States",
        )
        profile = await ClientProfile.create(
            user_id=user.id,
            full_name="Jamie Park",
            email="jamie.approve@example.com",
            country="United States",
        )
        await ClientAccount.create(
            client_profile=profile,
            account_number="MT5-APR-01",
            balance=2000.0,
            equity=2100.0,
        )
        tx = await ClientTransaction.create(
            user_id=user.id,
            account_number="MT5-APR-01",
            transaction_type="Deposit",
            amount=500.0,
            payment_method="Wire Transfer",
            status="Pending",
        )
        pending = await PendingRequest.create(
            request_type="deposit",
            client_name="Jamie Park",
            user_id=user.id,
            amount=500.0,
            status="Pending",
            payload={
                "transaction_id": tx.id,
                "account_number": "MT5-APR-01",
                "amount": 500.0,
                "payment_method": "Wire Transfer",
            },
        )

        called = {}

        async def fake_send_admin_approval_email(**kwargs):
            called["email"] = kwargs["user"].email
            called["request_type"] = kwargs["request_type"]
            called["approved_by"] = kwargs["approved_by"]

        monkeypatch.setattr(
            pending_view, "_send_admin_approval_email", fake_send_admin_approval_email
        )

        request = type(
            "Request",
            (),
            {
                "method": "POST",
                "headers": {},
                "GET": {},
                "body": json.dumps({"status": "approved"}).encode(),
                "user": type(
                    "User",
                    (),
                    {"is_authenticated": True, "is_staff": True, "name": "System Admin"},
                )(),
            },
        )()

        response = await decide_pending_request(request, request_id=f"PEN-{pending.id}")
        payload = json.loads(response.content)

        assert response.status_code == 200
        assert payload["status"] == "ok"
        assert called["email"] == "jamie.approve@example.com"
        assert called["request_type"] == "deposit"
        assert called["approved_by"] == "System Admin"

        refreshed_pending = await PendingRequest.get(id=pending.id)
        refreshed_tx = await ClientTransaction.get(id=tx.id)
        assert refreshed_pending.status == "Approved"
        assert refreshed_tx.status == "Approved"

    async def test_admin_approves_profile_request_sends_email(self, monkeypatch):
        """Test approving a profile update request sends the update approval email."""
        from adminPanel.view import pending_requests as pending_view

        user = await ClientUser.create(
            user_code="USR-PROFILE-APR1",
            name="Jamie Park",
            email="jamie.profile.approve@example.com",
            country="United States",
        )
        await ClientProfile.create(
            user_id=user.id,
            full_name="Jamie Park",
            email="jamie.profile.approve@example.com",
            country="United States",
        )
        pending = await PendingRequest.create(
            request_type="profile",
            client_name="Jamie Park",
            user_id=user.id,
            amount=0.0,
            status="Pending",
            payload={
                "full_name": "Jamie Park Updated",
                "phone": "+1 555 0101",
                "country": "Canada",
                "city": "Toronto",
                "postal_code": "M5H 2N2",
                "tier": "VIP",
                "kyc_status": "Verified",
            },
        )

        called = {}

        async def fake_send_admin_update_approval_email(**kwargs):
            called["email"] = kwargs["user"].email
            called["request_type"] = kwargs["request_type"]
            called["approved_by"] = kwargs["approved_by"]

        monkeypatch.setattr(
            pending_view, "_send_admin_update_approval_email", fake_send_admin_update_approval_email
        )

        request = type(
            "Request",
            (),
            {
                "method": "POST",
                "headers": {},
                "GET": {},
                "body": json.dumps({"status": "approved"}).encode(),
                "user": type(
                    "User",
                    (),
                    {"is_authenticated": True, "is_staff": True, "name": "System Admin"},
                )(),
            },
        )()

        response = await decide_pending_request(request, request_id=f"PEN-{pending.id}")
        payload = json.loads(response.content)

        assert response.status_code == 200
        assert payload["status"] == "ok"
        assert called["email"] == "jamie.profile.approve@example.com"
        assert called["request_type"] == "profile"
        assert called["approved_by"] == "System Admin"

        refreshed_pending = await PendingRequest.get(id=pending.id)
        refreshed_user = await ClientUser.get(id=user.id)
        assert refreshed_pending.status == "Approved"
        assert refreshed_user.country == "Canada"

    async def test_admin_rejects_deposit_request_sends_email(self, monkeypatch):
        """Test rejecting a deposit request sends the rejection email to the client."""
        from adminPanel.view import pending_requests as pending_view

        user = await ClientUser.create(
            user_code="USR-REJECT1",
            name="Jordan Kim",
            email="jordan.reject@example.com",
            country="United States",
        )
        profile = await ClientProfile.create(
            user_id=user.id,
            full_name="Jordan Kim",
            email="jordan.reject@example.com",
            country="United States",
        )
        await ClientAccount.create(
            client_profile=profile,
            account_number="MT5-REJ-01",
            balance=2000.0,
            equity=2100.0,
        )
        tx = await ClientTransaction.create(
            user_id=user.id,
            account_number="MT5-REJ-01",
            transaction_type="Deposit",
            amount=500.0,
            payment_method="Wire Transfer",
            status="Pending",
        )
        pending = await PendingRequest.create(
            request_type="deposit",
            client_name="Jordan Kim",
            user_id=user.id,
            amount=500.0,
            status="Pending",
            payload={
                "transaction_id": tx.id,
                "account_number": "MT5-REJ-01",
                "amount": 500.0,
                "payment_method": "Wire Transfer",
            },
        )

        called = {}

        async def fake_send_admin_rejection_email(**kwargs):
            called["email"] = kwargs["user"].email
            called["request_type"] = kwargs["request_type"]
            called["reviewed_by"] = kwargs["reviewed_by"]
            called["reason"] = kwargs["reason"]

        monkeypatch.setattr(
            pending_view, "_send_admin_rejection_email", fake_send_admin_rejection_email
        )

        request = type(
            "Request",
            (),
            {
                "method": "POST",
                "headers": {},
                "GET": {},
                "body": json.dumps({"status": "rejected", "reason": "Invalid receipt"}).encode(),
                "user": type(
                    "User",
                    (),
                    {"is_authenticated": True, "is_staff": True, "name": "System Admin"},
                )(),
            },
        )()

        response = await decide_pending_request(request, request_id=f"PEN-{pending.id}")
        payload = json.loads(response.content)

        assert response.status_code == 200
        assert payload["status"] == "ok"
        assert called["email"] == "jordan.reject@example.com"
        assert called["request_type"] == "deposit"
        assert called["reviewed_by"] == "System Admin"
        assert called["reason"] == "Invalid receipt"

        refreshed_pending = await PendingRequest.get(id=pending.id)
        refreshed_tx = await ClientTransaction.get(id=tx.id)
        assert refreshed_pending.status == "Rejected"
        assert refreshed_tx.status == "Rejected"

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
                "headers": {
                    "Authorization": f"Bearer {create_client_login_token(user.id, user.email)}"
                },
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
        assert (
            create_payload["ticket"]["description"]
            == "My withdrawal has been pending for two business days."
        )

        saved = await ClientTicket.filter(client_profile_id=profile.id).first()
        assert saved is not None

        detail_request = type(
            "Request",
            (),
            {
                "method": "GET",
                "headers": {
                    "Authorization": f"Bearer {create_client_login_token(user.id, user.email)}"
                },
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
                "headers": {
                    "Authorization": f"Bearer {create_client_login_token(other_user.id, other_user.email)}"
                },
                "GET": {},
                "body": b"",
            },
        )()

        forbidden_response = await get_client_ticket_detail(forbidden_request, ticket_id=saved.id)
        forbidden_payload = json.loads(forbidden_response.content)

        assert forbidden_response.status_code == 404
        assert forbidden_payload["status"] == "error"
