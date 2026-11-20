"""Unit tests for centres and admin routes."""
import pytest


def test_centres_list(client):
    """Verify that /api/centres returns list of accredited autism centers."""
    response = client.get("/api/centres")
    assert response.status_code == 200
    data = response.get_json()
    assert "centres" in data
    assert len(data["centres"]) >= 1
    first_centre = data["centres"][0]
    assert "latitude" in first_centre
    assert "longitude" in first_centre
    assert "facility_type" in first_centre
    assert "city" in first_centre


def test_centres_recommended_suggestions(client):
    """Verify that /api/centres/recommended returns accredited suggestions."""
    response = client.get("/api/centres/recommended?limit=4")
    assert response.status_code == 200
    data = response.get_json()
    assert "suggestions" in data
    assert len(data["suggestions"]) == 4


def test_centres_sorting_by_name(client):
    """Verify that /api/centres?sort_by=name returns alphabetical sorting."""
    response = client.get("/api/centres?sort_by=name")
    assert response.status_code == 200
    data = response.get_json()
    centres = data["centres"]
    names = [c["name"] for c in centres]
    assert names == sorted(names)


def test_centres_distance_filtering(client):
    """Verify that distance radius filtering functions with latitude & longitude."""
    response = client.get("/api/centres?lat=12.9716&lng=77.5946&radius_km=50")
    assert response.status_code == 200
    data = response.get_json()
    for c in data["centres"]:
        assert c["distance_km"] <= 50.0


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
