"""URL routing for clientPanel - all endpoints defined here via path()."""

from django.urls import path

from clientPanel.view.account import get_client_account, create_client_trading_account
from clientPanel.view.activity_logs import get_client_activity_logs
from clientPanel.view.dashboard import get_client_dashboard
from clientPanel.view.deposit import create_client_deposit
from clientPanel.view.investments import get_client_investments, pause_copying_api, start_copying_api
from clientPanel.view.profile import get_client_profile
from clientPanel.view.logout import logout_client
from clientPanel.view.reset_password import change_client_password, reset_client_password
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
    path("change-password", change_client_password, name="change-password"),
    path("logout", logout_client, name="logout"),
    path("activity-logs", get_client_activity_logs, name="activity-logs"),
    path("dashboard", get_client_dashboard, name="dashboard"),
    path("deposit", create_client_deposit, name="deposit"),
    path("withdrawal", create_client_withdrawal, name="withdrawal"),
    path("profile", get_client_profile, name="profile"),
    path("account", get_client_account, name="account"),
    path("accounts/create", create_client_trading_account, name="create-account"),
    path("my-investments", get_client_investments, name="my-investments"),
    path("my-investments/pause", pause_copying_api, name="pause-copying"),
    path("my-investments/start", start_copying_api, name="start-copying"),
    path("transactions", get_client_transactions, name="transactions"),
    path("tickets", get_client_tickets, name="tickets"),
    path("tickets/create", create_client_ticket, name="ticket-create"),
    path("tickets/<int:ticket_id>", get_client_ticket_detail, name="ticket-detail"),
]
