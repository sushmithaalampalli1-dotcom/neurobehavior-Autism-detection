"""Unit tests for centres and admin routes."""
import pytest


def test_centres_list(client):
    """Verify that /api/centres returns list of autism centers."""
    response = client.get("/api/centres")
    assert response.status_code == 200
    data = response.get_json()
    assert "centres" in data
    assert len(data["centres"]) >= 1
    first_centre = data["centres"][0]
    assert "latitude" in first_centre
    assert "longitude" in first_centre


def test_admin_overview_unauthorized(client):
    """Verify that unauthenticated access to /api/admin/overview is rejected with 401."""
    response = client.get("/api/admin/overview")
    assert response.status_code == 401


def test_admin_overview_authorized(client, test_admin):
    """Verify that authenticated administrator can access /api/admin/overview."""
    response = client.get("/api/admin/overview", headers=test_admin["header"])
    assert response.status_code == 200
    data = response.get_json()
    assert "metrics" in data
    assert "system_status" in data
    assert "abide_configuration" in data
