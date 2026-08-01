"""Tests for main application."""

import pytest
from django.test import Client

import app.main  # noqa: F401  (configures Django settings and the URLconf on import)


@pytest.fixture
def client():
    """Create a test client."""
    return Client()


def test_root(client):
    """Test root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    if response.headers.get("content-type", "").startswith("text/html"):
        content = b"".join(response.streaming_content)
        assert len(content) > 0
    else:
        assert response.json() == {"message": "Welcome to MAM!"}


def test_health(client):
    """Test health endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_frontend_page_routes(client):
    """Test frontend page routing (e.g. /admin/dashboard, /client/dashboard)."""
    for route in ["/admin/dashboard", "/client/dashboard", "/admin"]:
        response = client.get(route)
        assert response.status_code == 200
