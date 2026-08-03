"""URL routing for adminPanel - all endpoints defined here via path()."""

from django.urls import path

from adminPanel.view.client_profile import update_client_profile
from adminPanel.view.dashboard import get_admin_dashboard
from adminPanel.view.mam_accounts import create_mam_account
from adminPanel.view.pending_requests import (
    list_pending_banks,
    list_pending_cryptos,
    list_pending_deposits,
    list_pending_documents,
    list_pending_profiles,
    list_pending_requests,
    list_pending_withdrawals,
)
from adminPanel.views import (
    create_admin_user,
    create_client_user,
    list_activity_logs,
    list_admin_system_users,
    list_client_users,
    list_investors,
    list_managers,
)

app_name = "adminPanel"

urlpatterns = [
    path("dashboard", get_admin_dashboard, name="dashboard"),
    path("requests", list_pending_requests, name="requests"),
    path("requests/deposits", list_pending_deposits, name="requests-deposits"),
    path("requests/withdrawals", list_pending_withdrawals, name="requests-withdrawals"),
    path("requests/documents", list_pending_documents, name="requests-documents"),
    path("requests/profiles", list_pending_profiles, name="requests-profiles"),
    path("requests/banks", list_pending_banks, name="requests-banks"),
    path("requests/cryptos", list_pending_cryptos, name="requests-cryptos"),
    path("admin-users", list_admin_system_users, name="admin-users"),
    path("users", list_client_users, name="users"),
    path("users/<str:user_id>/profile", update_client_profile, name="update-client-profile"),
    path("managers", list_managers, name="managers"),
    path("investors", list_investors, name="investors"),
    path("activity", list_activity_logs, name="activity"),
    path("admin-users/create", create_admin_user, name="create-admin-user"),
    path("users/create", create_client_user, name="create-client-user"),
    path("mam-accounts/create", create_mam_account, name="create-mam-account"),
]
