"""Unit test for backend health check endpoint."""
import pytest
from backend.app import create_app


@pytest.fixture
def client():
    """Create a test client using the testing configuration."""
    app = create_app(config_name="testing")
    with app.test_client() as test_client:
        yield test_client


def test_health_check_returns_ok(client):
    """Verify that /api/health returns status 200 and json payload."""
    response = client.get("/api/health")
    assert response.status_code == 200

    data = response.get_json()
    assert data["status"] == "ok"
    assert "app_name" in data
    assert "subsystems" in data
    assert "mri_pipeline" in data
    assert "disclaimer" in data


def test_index_route(client):
    """Verify that root / returns 200 with project metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.get_json()
    assert data["project"] == "NeuroBehavior-ASD"
    assert "target_classes" in data
