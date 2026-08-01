"""URL routing for clientPanel — all endpoints defined here via path()."""

from django.urls import path

from clientPanel.views import (
    get_client_account,
    get_client_investments,
    get_client_profile,
    get_client_tickets,
    get_client_transactions,
)

app_name = "clientPanel"

urlpatterns = [
    path("profile", get_client_profile, name="profile"),
    path("account", get_client_account, name="account"),
    path("my-investments", get_client_investments, name="my-investments"),
    path("transactions", get_client_transactions, name="transactions"),
    path("tickets", get_client_tickets, name="tickets"),
]
