"""URL routing for clientPanel - all endpoints defined here via path()."""

from django.urls import path

from backendPanel.permissions import IsClient, permission_required
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
    reset_investor_password,
    toggle_manager_status,
)
from clientPanel.view.OpenPositions import get_client_open_positions
from clientPanel.view.payment_details import client_payment_details
from clientPanel.view.profile import get_client_profile, upload_client_avatar
from clientPanel.view.reset_password import (
    change_client_password,
    request_client_password_reset,
    reset_client_password,
)
from clientPanel.view.tickets import (
    create_client_ticket,
    get_client_ticket_detail,
    get_client_tickets,
)
from clientPanel.view.transactions import get_client_transactions
from clientPanel.view.withdrawal import create_client_withdrawal

app_name = "clientPanel"

client_only = permission_required(IsClient)

urlpatterns = [
    path("reset-password", reset_client_password, name="reset-password"),
    path("request-password-reset", request_client_password_reset, name="request-password-reset"),
    path("change-password", client_only(change_client_password), name="change-password"),
    path("logout", logout_client, name="logout"),
    path("activity-logs", client_only(get_client_activity_logs), name="activity-logs"),
    path("dashboard", client_only(get_client_dashboard), name="dashboard"),
    path("deposit", client_only(create_client_deposit), name="deposit"),
    path("withdrawal", client_only(create_client_withdrawal), name="withdrawal"),
    path("profile", client_only(get_client_profile), name="profile"),
    path("profile/avatar", client_only(upload_client_avatar), name="profile-avatar"),
    path("payment-details", client_only(client_payment_details), name="payment-details"),
    path("documents", client_only(client_documents), name="documents"),
    path("account", client_only(get_client_account), name="account"),
    path("accounts/create", client_only(create_client_trading_account), name="create-account"),
    path("mam-managers", client_only(list_mam_managers), name="mam-managers-list"),
    path("my-mam-managers", client_only(list_my_mam_managers), name="my-mam-managers-list"),
    path("mam-managers/invest", client_only(invest_in_manager), name="mam-managers-invest"),
    path(
        "mam-managers/<str:account_id>/investors",
        client_only(get_manager_investors),
        name="mam-manager-investors",
    ),
    path(
        "mam-managers/<str:account_id>/status",
        client_only(toggle_manager_status),
        name="mam-manager-status",
    ),
    path(
        "mam-managers/reset-password",
        client_only(reset_investor_password),
        name="mam-managers-reset-password",
    ),
    path(
        "reset-investor-password",
        client_only(reset_investor_password),
        name="reset-investor-password",
    ),
    path("invest", client_only(invest_in_manager), name="mam-invest"),
    path("my-investments", client_only(get_client_investments), name="my-investments"),
    path("my-investments/pause", client_only(pause_copying_api), name="pause-copying"),
    path("my-investments/start", client_only(start_copying_api), name="start-copying"),
    path(
        "my-investments/coefficient",
        client_only(deploy_coefficient_config_api),
        name="deploy-coefficient",
    ),
    path(
        "open-positions/<int:account_id>/",
        client_only(get_client_open_positions),
        name="open-positions",
    ),
    path(
        "open-positions/<int:account_id>",
        client_only(get_client_open_positions),
        name="open-positions-no-slash",
    ),
    path("transactions", client_only(get_client_transactions), name="transactions"),
    path("tickets", client_only(get_client_tickets), name="tickets"),
    path("tickets/create", client_only(create_client_ticket), name="ticket-create"),
    path("tickets/<int:ticket_id>", client_only(get_client_ticket_detail), name="ticket-detail"),
]
