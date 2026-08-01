"""URL routing for clientPanel - all endpoints defined here via path()."""

from django.urls import path

from clientPanel.view.account import get_client_account
from clientPanel.view.deposit import create_client_deposit
from clientPanel.view.dashboard import get_client_dashboard
from clientPanel.view.investments import get_client_investments
from clientPanel.view.login import login_client
from clientPanel.view.profile import get_client_profile
from clientPanel.view.reset_password import reset_client_password
from clientPanel.view.withdrawal import create_client_withdrawal
from clientPanel.view.tickets import get_client_tickets
from clientPanel.view.transactions import get_client_transactions

app_name = "clientPanel"

urlpatterns = [
    path("login", login_client, name="login"),
    path("reset-password", reset_client_password, name="reset-password"),
    path("dashboard", get_client_dashboard, name="dashboard"),
    path("deposit", create_client_deposit, name="deposit"),
    path("withdrawal", create_client_withdrawal, name="withdrawal"),
    path("profile", get_client_profile, name="profile"),
    path("account", get_client_account, name="account"),
    path("my-investments", get_client_investments, name="my-investments"),
    path("transactions", get_client_transactions, name="transactions"),
    path("tickets", get_client_tickets, name="tickets"),
]
