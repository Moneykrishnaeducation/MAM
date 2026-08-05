"""URL routing for adminPanel - all endpoints defined here via path()."""

from django.urls import path

from adminPanel.view import mt5_crud
from adminPanel.view.client_profile import update_client_profile
from adminPanel.view.client_payment import update_client_payment_details
from adminPanel.view.client_tickets import list_client_tickets
from adminPanel.view.client_transactions import list_client_transactions
from adminPanel.view.dashboard import get_admin_dashboard
from adminPanel.view.mam_accounts import create_account_api
from adminPanel.view.open_positions import get_admin_open_positions, get_admin_user_open_positions
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
from adminPanel.view.logout import logout_admin
from adminPanel.views import (
    admin_profile,
    create_admin_user,
    create_client_user,
    list_activity_logs,
    list_admin_system_users,
    list_client_users,
    get_client_user_kyc,
    list_investors,
    list_managers,
    update_admin_user,
    update_client_user_documents,
    delete_user,
)

app_name = "adminPanel"

urlpatterns = [
    path("dashboard", get_admin_dashboard, name="dashboard"),
    path("requests", list_pending_requests, name="requests"),
    path("requests/summary", list_pending_requests_summary, name="requests-summary"),
    path("requests/deposits", list_pending_deposits, name="requests-deposits"),
    path("requests/withdrawals", list_pending_withdrawals, name="requests-withdrawals"),
    path("requests/documents", list_pending_documents, name="requests-documents"),
    path("requests/profiles", list_pending_profiles, name="requests-profiles"),
    path("requests/banks", list_pending_banks, name="requests-banks"),
    path("requests/cryptos", list_pending_cryptos, name="requests-cryptos"),
    path("requests/decision", decide_pending_request, name="request-decision-legacy"),
    path("requests/<str:request_id>/decision", decide_pending_request, name="request-decision"),
    path("admin-users", list_admin_system_users, name="admin-users"),
    path("admin-users/<str:user_id>/update", update_admin_user, name="update-admin-user"),
    path("logout", logout_admin, name="logout"),
    path("profile", admin_profile, name="profile"),
    path("users", list_client_users, name="users"),
    path("users/<str:user_id>/kyc", get_client_user_kyc, name="client-kyc"),
    path("users/<str:user_id>/documents", update_client_user_documents, name="update-client-documents"),
    path("users/<str:user_id>/profile", update_client_profile, name="update-client-profile"),
    path("users/<str:user_id>/payment", update_client_payment_details, name="update-client-payment"),
    path("users/<str:user_id>/delete", delete_user, name="delete-user"),
    path("users/<str:user_id>/tickets", list_client_tickets, name="client-tickets"),
    path("users/<str:user_id>/transactions", list_client_transactions, name="client-transactions"),
    path("users/<str:user_id>/open-positions", get_admin_user_open_positions, name="client-open-positions"),
    path("open-positions/<int:account_id>/", get_admin_open_positions, name="open-positions"),
    path("open-positions/<int:account_id>", get_admin_open_positions, name="open-positions-no-slash"),
    path("managers", list_managers, name="managers"),
    path("investors", list_investors, name="investors"),
    path("activity", list_activity_logs, name="activity"),
    path("admin-users/create", create_admin_user, name="create-admin-user"),
    path("users/create", create_client_user, name="create-client-user"),
    path("accounts/create", create_account_api, name="create-account"),
    # MT5 CRUD Routes
    path("server-settings", mt5_crud.server_settings_list_create, name="server-settings-list-create"),
    path("server-settings/<int:pk>", mt5_crud.server_setting_detail_update_delete, name="server-setting-detail"),
    path("group-configs", mt5_crud.group_configs_list_create, name="group-configs-list-create"),
    path("group-configs/<int:pk>", mt5_crud.group_config_detail_update_delete, name="group-config-detail"),
    path("trade-groups", mt5_crud.trade_groups_list_create, name="trade-groups-list-create"),
    path("trade-groups/<int:pk>", mt5_crud.trade_group_detail_update_delete, name="trade-group-detail"),
    path("mam-accounts-crud", mt5_crud.mam_accounts_list_create, name="mam-accounts-list-create"),
    path("mam-accounts-crud/<int:pk>", mt5_crud.mam_account_detail_update_delete, name="mam-account-detail"),
    path("investors-crud", mt5_crud.investors_list_create, name="investors-list-create"),
    path("investors-crud/<int:pk>", mt5_crud.investor_detail_update_delete, name="investor-detail"),
    path("groups/sync", mt5_crud.sync_groups_from_mt5, name="groups-sync"),
]

