"""URL routing for clientPanel - all endpoints defined here via path()."""

from django.urls import path

from clientPanel.view.account import create_client_trading_account, get_client_account
from clientPanel.view.activity_logs import get_client_activity_logs
from clientPanel.view.dashboard import get_client_dashboard
from clientPanel.view.deposit import create_client_deposit
from clientPanel.view.documents import client_documents
from clientPanel.view.investments import (
    deploy_coefficient_config_api,
    get_client_investments,
    pause_copying_api,
    start_copying_api,
)
from clientPanel.view.logout import logout_client
from clientPanel.view.mam_managers import (
    get_manager_investors,
    invest_in_manager,
    list_mam_managers,
    list_my_mam_managers,
    toggle_manager_status,
)
from clientPanel.view.OpenPositions import get_client_open_positions
from clientPanel.view.payment_details import client_payment_details
from clientPanel.view.profile import get_client_profile
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
    path("payment-details", client_payment_details, name="payment-details"),
    path("documents", client_documents, name="documents"),
    path("account", get_client_account, name="account"),
    path("accounts/create", create_client_trading_account, name="create-account"),
    path("mam-managers", list_mam_managers, name="mam-managers-list"),
    path("my-mam-managers", list_my_mam_managers, name="my-mam-managers-list"),
    path("mam-managers/invest", invest_in_manager, name="mam-managers-invest"),
    path("mam-managers/<str:account_id>/investors", get_manager_investors, name="mam-manager-investors"),
    path("mam-managers/<str:account_id>/status", toggle_manager_status, name="mam-manager-status"),
    path("invest", invest_in_manager, name="mam-invest"),
    path("my-investments", get_client_investments, name="my-investments"),
    path("my-investments/pause", pause_copying_api, name="pause-copying"),
    path("my-investments/start", start_copying_api, name="start-copying"),
    path("my-investments/coefficient", deploy_coefficient_config_api, name="deploy-coefficient"),
    path("open-positions/<int:account_id>/", get_client_open_positions, name="open-positions"),
    path("open-positions/<int:account_id>", get_client_open_positions, name="open-positions-no-slash"),
    path("transactions", get_client_transactions, name="transactions"),
    path("tickets", get_client_tickets, name="tickets"),
    path("tickets/create", create_client_ticket, name="ticket-create"),
    path("tickets/<int:ticket_id>", get_client_ticket_detail, name="ticket-detail"),
]
