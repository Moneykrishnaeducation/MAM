"""URL routing for clientPanel - all endpoints defined here via path()."""

from django.urls import path

from clientPanel.view.account import get_client_account
from clientPanel.view.dashboard import get_client_dashboard
from clientPanel.view.deposit import create_client_deposit
from clientPanel.view.investments import get_client_investments
from clientPanel.view.profile import get_client_profile
from clientPanel.view.reset_password import reset_client_password
from clientPanel.view.tickets import (
    create_client_ticket,
    get_client_ticket_detail,
    get_client_tickets,
)
from clientPanel.view.transactions import get_client_transactions
from clientPanel.view.withdrawal import create_client_withdrawal

app_name = "clientPanel"

urlpatterns = [
    path("reset-password", reset_client_password, name="reset-password"),
    path("dashboard", get_client_dashboard, name="dashboard"),
    path("deposit", create_client_deposit, name="deposit"),
    path("withdrawal", create_client_withdrawal, name="withdrawal"),
    path("profile", get_client_profile, name="profile"),
    path("account", get_client_account, name="account"),
    path("my-investments", get_client_investments, name="my-investments"),
    path("transactions", get_client_transactions, name="transactions"),
    path("tickets", get_client_tickets, name="tickets"),
    path("tickets/create", create_client_ticket, name="ticket-create"),
    path("tickets/<int:ticket_id>", get_client_ticket_detail, name="ticket-detail"),
]
