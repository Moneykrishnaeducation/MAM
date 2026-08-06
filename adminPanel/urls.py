"""URL routing for adminPanel - all endpoints defined here via path()."""

from django.urls import path

from adminPanel.view import mt5_crud
from adminPanel.view.client_profile import get_client_profile_details, update_client_profile
from adminPanel.view.client_payment import get_client_payment_details_api, update_client_payment_details
from adminPanel.view.client_tickets import list_client_tickets
from adminPanel.view.client_transactions import get_client_transactions_details, list_client_transactions
from adminPanel.view.dashboard import get_admin_dashboard
from adminPanel.view.balance_sync import sync_trading_balances_api
from adminPanel.view.mam_accounts import create_account_api
from adminPanel.view.manager_fund_actions import (
    manager_credit_in_api,
    manager_credit_out_api,
    manager_deposit_api,
    manager_history_api,
    manager_investors_list_api,
    manager_withdraw_api,
    account_financial_action_api,
)
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
from adminPanel.view.transactions import list_admin_transactions
from adminPanel.view.logout import logout_admin
from adminPanel.view.mail import admin_mails
from backendPanel.permissions import IsAdmin, permission_required
from adminPanel.views import (
    admin_profile,
    create_admin_user,
    create_client_user,
    list_admin_activity_logs,
    list_client_activity_logs,
    list_error_activity_logs,
    list_activity_logs,
    list_admin_system_users,
    list_client_users,
    get_client_user_kyc,
    list_investors,
    list_managers,
    update_admin_user,
    update_client_user_documents,
    delete_user,
    update_client_user_status,
)

app_name = "adminPanel"

admin_only = permission_required(IsAdmin)

urlpatterns = [
    path("dashboard", admin_only(get_admin_dashboard), name="dashboard"),
    path("requests", admin_only(list_pending_requests), name="requests"),
    path("requests/summary", admin_only(list_pending_requests_summary), name="requests-summary"),
    path("requests/deposits", admin_only(list_pending_deposits), name="requests-deposits"),
    path("requests/withdrawals", admin_only(list_pending_withdrawals), name="requests-withdrawals"),
    path("requests/documents", admin_only(list_pending_documents), name="requests-documents"),
    path("requests/profiles", admin_only(list_pending_profiles), name="requests-profiles"),
    path("requests/banks", admin_only(list_pending_banks), name="requests-banks"),
    path("requests/cryptos", admin_only(list_pending_cryptos), name="requests-cryptos"),
    path("requests/decision", admin_only(decide_pending_request), name="request-decision-legacy"),
    path("requests/<str:request_id>/decision", admin_only(decide_pending_request), name="request-decision"),
    path("admin-users", admin_only(list_admin_system_users), name="admin-users"),
    path("admin-users/<str:user_id>/update", admin_only(update_admin_user), name="update-admin-user"),
    path("logout", admin_only(logout_admin), name="logout"),
    path("profile", admin_only(admin_profile), name="profile"),
    path("users", admin_only(list_client_users), name="users"),
    path("users/<str:user_id>/kyc", admin_only(get_client_user_kyc), name="client-kyc"),
    path("users/<str:user_id>/documents", admin_only(update_client_user_documents), name="update-client-documents"),
    path("users/<str:user_id>/status", admin_only(update_client_user_status), name="update-client-status"),
    path("users/<str:user_id>/profile", admin_only(update_client_profile), name="update-client-profile"),
    path("users/<str:user_id>/profile/details", admin_only(get_client_profile_details), name="get-client-profile-details"),
    path("users/<str:user_id>/payment", admin_only(update_client_payment_details), name="update-client-payment"),
    path("users/<str:user_id>/payment/details", admin_only(get_client_payment_details_api), name="get-client-payment-details"),
    path("users/<str:user_id>/delete", admin_only(delete_user), name="delete-user"),
    path("users/<str:user_id>/tickets", admin_only(list_client_tickets), name="client-tickets"),
    path("users/<str:user_id>/transactions", admin_only(list_client_transactions), name="client-transactions"),
    path("users/<str:user_id>/open-positions", admin_only(get_admin_user_open_positions), name="client-open-positions"),
    path("users/<str:user_id>/transactions/details", admin_only(get_client_transactions_details), name="get-client-transactions-details"),
    path("open-positions/<int:account_id>/", admin_only(get_admin_open_positions), name="open-positions"),
    path("open-positions/<int:account_id>", admin_only(get_admin_open_positions), name="open-positions-no-slash"),
    path("managers", admin_only(list_managers), name="managers"),
    path("investors", admin_only(list_investors), name="investors"),
    path("activity/all", admin_only(list_activity_logs), name="activity-all"),
    path("activity", admin_only(list_activity_logs), name="activity"),
    path("activity/admin", admin_only(list_admin_activity_logs), name="activity-admin"),
    path("activity/client", admin_only(list_client_activity_logs), name="activity-client"),
    path("activity/error", admin_only(list_error_activity_logs), name="activity-error"),
    path("mails", admin_only(admin_mails), name="mails"),
    path("transactions", admin_only(list_admin_transactions), name="transactions"),
    path("admin-users/create", admin_only(create_admin_user), name="create-admin-user"),
    path("users/create", admin_only(create_client_user), name="create-client-user"),
    path("accounts/create", admin_only(create_account_api), name="create-account"),
    path("accounts/sync-balances", admin_only(sync_trading_balances_api), name="sync-balances"),
    path("accounts/financial-action", admin_only(account_financial_action_api), name="financial-action"),
    path("managers/deposit", admin_only(manager_deposit_api), name="manager-deposit"),
    path("managers/withdraw", admin_only(manager_withdraw_api), name="manager-withdraw"),
    path("managers/credit-in", admin_only(manager_credit_in_api), name="manager-credit-in"),
    path("managers/credit-out", admin_only(manager_credit_out_api), name="manager-credit-out"),
    path("managers/<str:account_id>/history", admin_only(manager_history_api), name="manager-history"),
    path("managers/<str:account_id>/investors", admin_only(manager_investors_list_api), name="manager-investors-list"),
    # MT5 CRUD Routes
    path("server-settings", admin_only(mt5_crud.server_settings_list_create), name="server-settings-list-create"),
    path("server-settings/<int:pk>", admin_only(mt5_crud.server_setting_detail_update_delete), name="server-setting-detail"),
    path("group-configs", admin_only(mt5_crud.group_configs_list_create), name="group-configs-list-create"),
    path("group-configs/<int:pk>", admin_only(mt5_crud.group_config_detail_update_delete), name="group-config-detail"),
    path("trade-groups", admin_only(mt5_crud.trade_groups_list_create), name="trade-groups-list-create"),
    path("trade-groups/<int:pk>", admin_only(mt5_crud.trade_group_detail_update_delete), name="trade-group-detail"),
    path("mam-accounts-crud", admin_only(mt5_crud.mam_accounts_list_create), name="mam-accounts-list-create"),
    path("mam-accounts-crud/<int:pk>", admin_only(mt5_crud.mam_account_detail_update_delete), name="mam-account-detail"),
    path("investors-crud", admin_only(mt5_crud.investors_list_create), name="investors-list-create"),
    path("investors-crud/<int:pk>", admin_only(mt5_crud.investor_detail_update_delete), name="investor-detail"),
    path("groups/sync", admin_only(mt5_crud.sync_groups_from_mt5), name="groups-sync"),
]

