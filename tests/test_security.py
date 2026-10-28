"""Security and Privacy Tests for NeuroBehavior-ASD.

Verifies all security constraints defined in Phase 3.
"""
import io
import pytest
from pathlib import Path


def test_invalid_login_credentials(client, test_patient):
    """Verify that wrong password returns 401 Unauthorized."""
    res = client.post("/api/auth/login", json={
        "email": test_patient["email"],
        "password": "WrongPassword999!"
    })
    assert res.status_code == 401
    assert "Invalid email or password" in res.get_json()["error"]


def test_duplicate_registration_rejected(client, test_patient):
    """Verify that registering an existing email returns 409 Conflict."""
    res = client.post("/api/auth/register", json={
        "full_name": "Duplicate User",
        "email": test_patient["email"],
        "password": "ValidPassword123!",
    })
    assert res.status_code == 409
    assert "already exists" in res.get_json()["error"]


def test_unauthorized_endpoints_blocked(client):
    """Verify that accessing protected endpoints without token returns 401."""
    endpoints = [
        ("/api/mri/history", "GET"),
        ("/api/questionnaire/history", "GET"),
        ("/api/assessments/history", "GET"),
        ("/api/reports/list", "GET"),
        ("/api/reports/generate", "POST"),
        ("/api/admin/overview", "GET"),
    ]
    for url, method in endpoints:
        if method == "GET":
            res = client.get(url)
        else:
            res = client.post(url, json={})
        assert res.status_code == 401, f"Expected 401 for {url}, got {res.status_code}"


def test_idor_prevent_accessing_another_patients_assessment(client, test_patient, other_patient):
    """Verify that Patient B cannot generate or access a report for Patient A's assessment."""
    # 1. Patient A submits an assessment
    payload = {
        "subject_age": "5",
        "informant_relationship": "Parent",
        "responses": {f"iasq_{i}": False for i in range(1, 11)},
    }
    create_res = client.post(
        "/api/questionnaire/submit",
        json=payload,
        headers=test_patient["header"],
    )
    assert create_res.status_code == 201
    patient_a_assessment_id = create_res.get_json()["assessment_id"]

    # 2. Patient B attempts to generate a report for Patient A's assessment ID
    hacked_res = client.post(
        "/api/reports/generate",
        json={"assessment_id": patient_a_assessment_id},
        headers=other_patient["header"],  # Patient B's token
    )
    assert hacked_res.status_code == 403
    assert "Access denied" in hacked_res.get_json()["error"]


def test_idor_prevent_downloading_another_patients_pdf(client, test_patient, other_patient):
    """Verify that Patient B cannot download Patient A's generated PDF file."""
    # 1. Patient A generates their PDF
    payload = {
        "subject_age": "5",
        "informant_relationship": "Parent",
        "responses": {f"iasq_{i}": False for i in range(1, 11)},
    }
    create_res = client.post(
        "/api/questionnaire/submit",
        json=payload,
        headers=test_patient["header"],
    )
    assessment_id = create_res.get_json()["assessment_id"]

    gen_res = client.post(
        "/api/reports/generate",
        json={"assessment_id": assessment_id},
        headers=test_patient["header"],
    )
    assert gen_res.status_code == 201
    pdf_filename = gen_res.get_json()["filename"]

    # 2. Patient B tries to download Patient A's PDF
    hacked_dl = client.get(
        f"/api/reports/download/{pdf_filename}",
        headers=other_patient["header"],
    )
    assert hacked_dl.status_code == 403
    assert "Access denied" in hacked_dl.get_json()["error"]


def test_admin_role_enforcement(client, test_patient, test_admin):
    """Verify that regular patients cannot access /api/admin/overview (403), but admins can (200)."""
    # Patient access attempt -> 403 Forbidden
    patient_res = client.get("/api/admin/overview", headers=test_patient["header"])
    assert patient_res.status_code == 403
    assert "Administrator privileges required" in patient_res.get_json()["error"]

    # Admin access attempt -> 200 OK
    admin_res = client.get("/api/admin/overview", headers=test_admin["header"])
    assert admin_res.status_code == 200
    assert "metrics" in admin_res.get_json()


def test_logout_invalidation(client):
    """Verify that a revoked token cannot be reused after logout."""
    reg_res = client.post("/api/auth/register", json={
        "full_name": "Logout Tester",
        "email": "logout_tester@example.org",
        "password": "Password123!",
    })
    assert reg_res.status_code == 201
    token = reg_res.get_json()["token"]
    header = {"Authorization": f"Bearer {token}"}

    # Valid before logout
    ok_res = client.get("/api/auth/me", headers=header)
    assert ok_res.status_code == 200

    # Logout
    logout_res = client.post("/api/auth/logout", headers=header)
    assert logout_res.status_code == 200

    # Blocked after logout
    blocked_res = client.get("/api/auth/me", headers=header)
    assert blocked_res.status_code == 401


def test_upload_invalid_format_rejected(client, test_patient):
    """Verify rejection of malicious/invalid executable files (.exe, .txt)."""
    fake_exe = (io.BytesIO(b"MZ executable header"), "malware.exe")
    res = client.post(
        "/api/mri/upload",
        data={"file": fake_exe},
        headers=test_patient["header"],
        content_type="multipart/form-data"
    )
    assert res.status_code == 400
    assert "Unsupported file format" in res.get_json()["error"]


def test_malformed_json_handling(client, test_patient):
    """Verify that malformed request payloads return clean 400 JSON errors."""
    res = client.post(
        "/api/questionnaire/submit",
        data="not a json {malformed",
        headers={**test_patient["header"], "Content-Type": "application/json"},
    )
    assert res.status_code in [400, 422]


def test_env_example_has_no_secrets():
    """Verify that .env.example does not contain real API keys or passwords."""
    root = Path(__file__).resolve().parent.parent
    env_example = root / ".env.example"
    assert env_example.exists()
    content = env_example.read_text(encoding="utf-8")

    forbidden_patterns = [
        "AKIA",  # AWS key pattern
        "AIza",  # Google API key pattern
        "ghp_",  # GitHub personal token
        "sk-",   # OpenAI key
        "password123",
        "supersecret",
    ]
    for pattern in forbidden_patterns:
        assert pattern not in content, f"Potentially real secret found in .env.example: {pattern}"
