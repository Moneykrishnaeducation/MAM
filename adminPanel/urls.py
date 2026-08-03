"""URL routing for adminPanel - all endpoints defined here via path()."""

from django.urls import path

from adminPanel.view.dashboard import get_admin_dashboard
from adminPanel.view.mam_accounts import create_mam_account
from adminPanel.views import (
    create_admin_user,
    create_client_user,
    list_activity_logs,
    list_admin_system_users,
    list_client_users,
    list_investors,
    list_managers,
    list_pending_requests,
)

app_name = "adminPanel"

urlpatterns = [
    path("dashboard", get_admin_dashboard, name="dashboard"),
    path("admin-users", list_admin_system_users, name="admin-users"),
    path("users", list_client_users, name="users"),
    path("requests", list_pending_requests, name="requests"),
    path("managers", list_managers, name="managers"),
    path("investors", list_investors, name="investors"),
    path("activity", list_activity_logs, name="activity"),
    path("admin-users/create", create_admin_user, name="create-admin-user"),
    path("users/create", create_client_user, name="create-client-user"),
    path("mam-accounts/create", create_mam_account, name="create-mam-account"),
]
