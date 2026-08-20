"""URL routing for adminPanel - all endpoints defined here via path()."""

from django.urls import path

from adminPanel.view import mt5_crud
from adminPanel.view.balance_sync import sync_trading_balances_api
from adminPanel.view.client_payment import (
    get_client_payment_details_api,
    update_client_payment_details,
)
from adminPanel.view.client_profile import get_client_profile_details, update_client_profile
from adminPanel.view.client_tickets import (
    list_all_tickets,
    list_client_tickets,
    update_ticket_status,
    add_admin_ticket_message,
)
from adminPanel.view.client_transactions import (
    get_client_transactions_details,
    list_client_transactions,
)
from adminPanel.view.dashboard import get_admin_dashboard
from adminPanel.view.internal_transfer import internal_transfer_api
from adminPanel.view.investor_fund_actions import (
    investor_credit_in_api,
    investor_credit_out_api,
    investor_deposit_api,
    investor_equity_api,
    investor_history_api,
    investor_withdraw_api,
)
from adminPanel.view.logout import logout_admin
from adminPanel.view.mail import admin_mails
from adminPanel.view.mam_accounts import create_account_api
from adminPanel.view.manager_fund_actions import (
    account_financial_action_api,
    manager_credit_in_api,
    manager_credit_out_api,
    manager_deposit_api,
    manager_history_api,
    manager_investors_list_api,
    manager_withdraw_api,
)
from adminPanel.view.non_demo_accounts import non_demo_accounts_api
from adminPanel.view.open_positions import get_admin_open_positions, get_admin_user_open_positions
from adminPanel.view.closed_positions import get_admin_closed_positions
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
from adminPanel.view.profit_share import list_admin_profit_share
from adminPanel.view.transactions import list_admin_transactions
from adminPanel.views import (
    admin_profile,
    create_admin_user,
    create_client_user,
    delete_user,
    get_client_user_kyc,
    list_activity_logs,
    list_admin_activity_logs,
    list_admin_system_users,
    list_client_activity_logs,
    list_client_users,
    list_error_activity_logs,
    list_investors,
    list_managers,
    update_admin_user,
    update_client_user_documents,
    update_client_user_status,
)
from backendPanel.permissions import IsAdmin, IsAdminOrSuperAdmin, IsSuperAdmin, permission_required

app_name = "adminPanel"

admin_only = permission_required(IsAdmin)
admin_write_only = permission_required(IsAdminOrSuperAdmin)  # Viewer excluded from write ops
super_admin_only = permission_required(IsSuperAdmin)

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
    path(
        "requests/decision",
        admin_write_only(decide_pending_request),
        name="request-decision-legacy",
    ),
    path(
        "requests/<str:request_id>/decision",
        admin_write_only(decide_pending_request),
        name="request-decision",
    ),
    path("admin-users", admin_only(list_admin_system_users), name="admin-users"),
    path(
        "admin-users/<str:user_id>/update",
        admin_write_only(update_admin_user),
        name="update-admin-user",
    ),
    path("logout", admin_only(logout_admin), name="logout"),
    path("profile", admin_only(admin_profile), name="profile"),
    path("users", admin_only(list_client_users), name="users"),
    path("users/<str:user_id>/kyc", admin_only(get_client_user_kyc), name="client-kyc"),
    path(
        "users/<str:user_id>/documents",
        admin_write_only(update_client_user_documents),
        name="update-client-documents",
    ),
    path(
        "users/<str:user_id>/status",
        admin_write_only(update_client_user_status),
        name="update-client-status",
    ),
    path(
        "users/<str:user_id>/profile",
        admin_write_only(update_client_profile),
        name="update-client-profile",
    ),
    path(
        "users/<str:user_id>/profile/details",
        admin_only(get_client_profile_details),
        name="get-client-profile-details",
    ),
    path(
        "users/<str:user_id>/payment",
        admin_write_only(update_client_payment_details),
        name="update-client-payment",
    ),
    path(
        "users/<str:user_id>/payment/details",
        admin_only(get_client_payment_details_api),
        name="get-client-payment-details",
    ),
    path("users/<str:user_id>/delete", admin_write_only(delete_user), name="delete-user"),
    path("users/<str:user_id>/tickets", admin_only(list_client_tickets), name="client-tickets"),
    path("tickets", admin_only(list_all_tickets), name="admin-tickets"),
    path(
        "tickets/<int:ticket_id>/status",
        admin_write_only(update_ticket_status),
        name="admin-update-ticket-status",
    ),
    path(
        "tickets/<int:ticket_id>/message",
        admin_write_only(add_admin_ticket_message),
        name="admin-add-ticket-message",
    ),
    path(
        "users/<str:user_id>/transactions",
        admin_only(list_client_transactions),
        name="client-transactions",
    ),
    path(
        "users/<str:user_id>/open-positions",
        admin_only(get_admin_user_open_positions),
        name="client-open-positions",
    ),
    path(
        "users/<str:user_id>/transactions/details",
        admin_only(get_client_transactions_details),
        name="get-client-transactions-details",
    ),
    path(
        "open-positions/<int:account_id>/",
        admin_only(get_admin_open_positions),
        name="open-positions",
    ),
    path(
        "open-positions/<int:account_id>",
        admin_only(get_admin_open_positions),
        name="open-positions-no-slash",
    ),
    path(
        "closed-positions/<int:account_id>/",
        admin_only(get_admin_closed_positions),
        name="closed-positions",
    ),
    path(
        "closed-positions/<int:account_id>",
        admin_only(get_admin_closed_positions),
        name="closed-positions-no-slash",
    ),
    path("managers", admin_only(list_managers), name="managers"),
    path("investors", admin_only(list_investors), name="investors"),
    path("activity/all", admin_only(list_activity_logs), name="activity-all"),
    path("activity", admin_only(list_activity_logs), name="activity"),
    path("activity/admin", admin_only(list_admin_activity_logs), name="activity-admin"),
    path("activity/client", admin_only(list_client_activity_logs), name="activity-client"),
    path("activity/error", admin_only(list_error_activity_logs), name="activity-error"),
    path("mails", admin_only(admin_mails), name="mails"),
    path("transactions", admin_only(list_admin_transactions), name="transactions"),
    path("profit-share/history", admin_only(list_admin_profit_share), name="profit-share-history"),
    path("admin-users/create", admin_write_only(create_admin_user), name="create-admin-user"),
    path("users/create", admin_write_only(create_client_user), name="create-client-user"),
    path("accounts/create", admin_write_only(create_account_api), name="create-account"),
    path(
        "accounts/sync-balances", admin_write_only(sync_trading_balances_api), name="sync-balances"
    ),
    path(
        "accounts/financial-action",
        admin_write_only(account_financial_action_api),
        name="financial-action",
    ),
    path("internal-transfer", admin_write_only(internal_transfer_api), name="internal-transfer"),
    path(
        "internal-transfer/",
        admin_write_only(internal_transfer_api),
        name="internal-transfer-slash",
    ),
    path("non-demo-accounts", admin_only(non_demo_accounts_api), name="non-demo-accounts"),
    path("non-demo-accounts/", admin_only(non_demo_accounts_api), name="non-demo-accounts-slash"),
    # Manager Fund Actions — write ops, Viewer blocked
    path("managers/deposit", admin_write_only(manager_deposit_api), name="manager-deposit"),
    path("managers/withdraw", admin_write_only(manager_withdraw_api), name="manager-withdraw"),
    path("managers/credit-in", admin_write_only(manager_credit_in_api), name="manager-credit-in"),
    path(
        "managers/credit-out", admin_write_only(manager_credit_out_api), name="manager-credit-out"
    ),
    path(
        "managers/<str:account_id>/history", admin_only(manager_history_api), name="manager-history"
    ),
    path(
        "managers/<str:account_id>/investors",
        admin_only(manager_investors_list_api),
        name="manager-investors-list",
    ),
    # Investor Fund Actions — write ops, Viewer blocked
    path("investors/deposit", admin_write_only(investor_deposit_api), name="investor-deposit"),
    path("investors/withdraw", admin_write_only(investor_withdraw_api), name="investor-withdraw"),
    path(
        "investors/credit-in", admin_write_only(investor_credit_in_api), name="investor-credit-in"
    ),
    path(
        "investors/credit-out",
        admin_write_only(investor_credit_out_api),
        name="investor-credit-out",
    ),
    path(
        "investors/<str:account_id>/equity", admin_only(investor_equity_api), name="investor-equity"
    ),
    path(
        "investors/<str:account_id>/history",
        admin_only(investor_history_api),
        name="investor-history",
    ),
    # MT5 CRUD Routes
    path(
        "server-settings",
        super_admin_only(mt5_crud.server_settings_list_create),
        name="server-settings-list-create",
    ),
    path(
        "server-settings/<int:pk>",
        super_admin_only(mt5_crud.server_setting_detail_update_delete),
        name="server-setting-detail",
    ),
    path(
        "group-configs",
        admin_only(mt5_crud.group_configs_list_create),
        name="group-configs-list-create",
    ),
    path(
        "group-configs/<int:pk>",
        admin_only(mt5_crud.group_config_detail_update_delete),
        name="group-config-detail",
    ),
    path(
        "trade-groups",
        admin_only(mt5_crud.trade_groups_list_create),
        name="trade-groups-list-create",
    ),
    path(
        "trade-groups/<int:pk>",
        admin_only(mt5_crud.trade_group_detail_update_delete),
        name="trade-group-detail",
    ),
    path(
        "mam-accounts-crud",
        admin_only(mt5_crud.mam_accounts_list_create),
        name="mam-accounts-list-create",
    ),
    path(
        "mam-accounts-crud/<int:pk>",
        admin_only(mt5_crud.mam_account_detail_update_delete),
        name="mam-account-detail",
    ),
    path(
        "investors-crud", admin_only(mt5_crud.investors_list_create), name="investors-list-create"
    ),
    path(
        "investors-crud/<int:pk>",
        admin_only(mt5_crud.investor_detail_update_delete),
        name="investor-detail",
    ),
    path("groups/sync", admin_only(mt5_crud.sync_groups_from_mt5), name="groups-sync"),
]
