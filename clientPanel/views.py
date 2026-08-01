"""Compatibility imports for clientPanel views."""

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

__all__ = [
    "login_client",
    "reset_client_password",
    "get_client_dashboard",
    "create_client_deposit",
    "create_client_withdrawal",
    "get_client_profile",
    "get_client_account",
    "get_client_investments",
    "get_client_transactions",
    "get_client_tickets",
]
