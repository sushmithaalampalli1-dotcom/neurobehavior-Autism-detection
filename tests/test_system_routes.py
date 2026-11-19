"""Unit tests for centres and admin routes."""
import pytest


def test_centres_list(client):
    """Verify that /api/centres returns list of autism centers with clinical ratings."""
    response = client.get("/api/centres")
    assert response.status_code == 200
    data = response.get_json()
    assert "centres" in data
    assert len(data["centres"]) >= 1
    first_centre = data["centres"][0]
    assert "latitude" in first_centre
    assert "longitude" in first_centre
    assert "rating" in first_centre
    assert first_centre["rating"] >= 4.0
    assert "review_count" in first_centre
    assert first_centre["review_count"] >= 100


def test_centres_top_rated_suggestions(client):
    """Verify that /api/centres/top-rated returns top-rated suggestions."""
    response = client.get("/api/centres/top-rated?limit=4")
    assert response.status_code == 200
    data = response.get_json()
    assert "suggestions" in data
    assert len(data["suggestions"]) == 4
    for item in data["suggestions"]:
        assert item["rating"] >= 4.8


def test_centres_sorting_by_rating(client):
    """Verify that /api/centres?sort_by=rating returns descending ratings."""
    response = client.get("/api/centres?sort_by=rating")
    assert response.status_code == 200
    data = response.get_json()
    centres = data["centres"]
    ratings = [c["rating"] for c in centres]
    assert ratings == sorted(ratings, reverse=True)


def test_centres_min_rating_filter(client):
    """Verify that min_rating filter only returns centres with rating >= threshold."""
    response = client.get("/api/centres?min_rating=4.9")
    assert response.status_code == 200
    data = response.get_json()
    for c in data["centres"]:
        assert c["rating"] >= 4.9


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
