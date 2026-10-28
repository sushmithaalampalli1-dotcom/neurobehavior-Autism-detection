"""Unit tests for MRI assessment routes."""
import io
import pytest


def test_mri_status_route(client):
    """Verify that /api/mri/status returns model deployment information."""
    response = client.get("/api/mri/status")
    assert response.status_code == 200
    data = response.get_json()
    assert "pipeline_name" in data
    assert "Active" in data["model_deployment_status"] or "Standby" in data["model_deployment_status"]
    assert data["target_labels"]["1"] == "Autism Spectrum Disorder (ASD)"
    assert data["target_labels"]["2"] == "Typical Control (TC)"


def test_mri_upload_missing_auth(client):
    """Verify that unauthenticated upload request is rejected with 401."""
    response = client.post("/api/mri/upload", data={})
    assert response.status_code == 401
    data = response.get_json()
    assert "Authentication required" in data["error"]


def test_mri_upload_missing_file(client, test_patient):
    """Verify error when no file is uploaded."""
    response = client.post("/api/mri/upload", data={}, headers=test_patient["header"])
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data


def test_mri_upload_invalid_extension(client, test_patient):
    """Verify rejection of non-image/non-NIfTI files (e.g. .txt)."""
    fake_txt = (io.BytesIO(b"fake data"), "scan.txt")
    response = client.post(
        "/api/mri/upload",
        data={"file": fake_txt},
        headers=test_patient["header"],
        content_type="multipart/form-data"
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "Unsupported file format" in data["error"]


def test_mri_upload_png_success(client, test_patient):
    """Verify that uploading a valid 2D PNG slice runs inference successfully."""
    from PIL import Image
    import numpy as np

    img = Image.fromarray((np.ones((224, 224)) * 128).astype(np.uint8))
    img_bytes = io.BytesIO()
    img.save(img_bytes, format="PNG")
    img_bytes.seek(0)

    response = client.post(
        "/api/mri/upload",
        data={"file": (img_bytes, "test_slice.png")},
        headers=test_patient["header"],
        content_type="multipart/form-data"
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert "prediction" in data
    assert data["prediction"]["dx_group"] in [1, 2]
    assert "confidence" in data["prediction"]
