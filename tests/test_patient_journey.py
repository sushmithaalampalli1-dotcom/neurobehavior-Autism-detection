"""Comprehensive End-to-End Test for the Complete Patient Journey.

Tests all 21 steps of the patient workflow defined in Phase 2.
"""
import io
import json
from pathlib import Path
import pytest
from PIL import Image
import numpy as np


def test_complete_patient_journey(client, app):
    """Execute and verify the full 21-step end-to-end patient workflow."""

    # -------------------------------------------------------------
    # Step 1: Open application / Health check
    # -------------------------------------------------------------
    health_res = client.get("/api/health")
    assert health_res.status_code == 200
    assert health_res.get_json()["status"] == "ok"

    # -------------------------------------------------------------
    # Step 2: Unauthenticated users are blocked from protected routes
    # -------------------------------------------------------------
    mri_res = client.get("/api/mri/history")
    assert mri_res.status_code == 401
    assert "Authentication required" in mri_res.get_json()["error"]

    q_res = client.get("/api/questionnaire/history")
    assert q_res.status_code == 401

    rep_res = client.get("/api/reports/list")
    assert rep_res.status_code == 401

    # -------------------------------------------------------------
    # Step 3: Register a new test patient
    # -------------------------------------------------------------
    patient_email = "newpatient_journey@neurobehavior.org"
    patient_password = "PatientPassword2026!"
    patient_name = "Journey Test Patient"

    reg_payload = {
        "full_name": patient_name,
        "email": patient_email,
        "password": patient_password,
        "role": "patient",
    }
    reg_res = client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    reg_data = reg_res.get_json()
    assert reg_data["success"] is True
    assert "token" in reg_data
    patient_id = reg_data["user"]["id"]
    token_1 = reg_data["token"]
    auth_header_1 = {"Authorization": f"Bearer {token_1}"}

    # -------------------------------------------------------------
    # Step 4: Verify account is saved in database correctly
    # -------------------------------------------------------------
    assert reg_data["user"]["email"] == patient_email
    assert reg_data["user"]["full_name"] == patient_name
    assert reg_data["user"]["role"] == "patient"

    # -------------------------------------------------------------
    # Step 5: Dashboard verification with token
    # -------------------------------------------------------------
    me_res = client.get("/api/auth/me", headers=auth_header_1)
    assert me_res.status_code == 200
    assert me_res.get_json()["user"]["id"] == patient_id

    # -------------------------------------------------------------
    # Step 6: Logout and token invalidation
    # -------------------------------------------------------------
    logout_res = client.post("/api/auth/logout", headers=auth_header_1)
    assert logout_res.status_code == 200
    assert logout_res.get_json()["success"] is True

    # Invalidation verification: Old token cannot be reused
    expired_check = client.get("/api/auth/me", headers=auth_header_1)
    assert expired_check.status_code == 401

    # -------------------------------------------------------------
    # Step 7: Login again using registered credentials
    # -------------------------------------------------------------
    login_payload = {
        "email": patient_email,
        "password": patient_password,
    }
    login_res = client.post("/api/auth/login", json=login_payload)
    assert login_res.status_code == 200
    login_data = login_res.get_json()
    token_2 = login_data["token"]
    auth_header_2 = {"Authorization": f"Bearer {token_2}"}

    # -------------------------------------------------------------
    # Step 8: Open MRI Screening (Check pipeline status)
    # -------------------------------------------------------------
    status_res = client.get("/api/mri/status")
    assert status_res.status_code == 200
    mri_status = status_res.get_json()
    assert "2.5D" in mri_status["pipeline_name"] or "2D" in mri_status["pipeline_name"]

    # -------------------------------------------------------------
    # Step 9: Upload a valid supported MRI input (224x224 grayscale PNG)
    # -------------------------------------------------------------
    img = Image.fromarray((np.ones((224, 224)) * 128).astype(np.uint8))
    img_bytes = io.BytesIO()
    img.save(img_bytes, format="PNG")
    img_bytes.seek(0)

    upload_res = client.post(
        "/api/mri/upload",
        data={"file": (img_bytes, "patient_brain_scan.png")},
        headers=auth_header_2,
        content_type="multipart/form-data"
    )

    # -------------------------------------------------------------
    # Step 10 & 11: Verify actual model inference & real output
    # -------------------------------------------------------------
    assert upload_res.status_code == 200
    upload_data = upload_res.get_json()
    assert upload_data["success"] is True
    assert "prediction" in upload_data
    assert upload_data["prediction"]["dx_group"] in [1, 2]
    assert 0.0 <= upload_data["prediction"]["confidence"] <= 1.0
    mri_assessment_id = upload_data["assessment_id"]

    # -------------------------------------------------------------
    # Step 12: Open Behavioral Assessment (Check IASQ schema)
    # -------------------------------------------------------------
    iasq_schema_res = client.get("/api/questionnaire/schema")
    assert iasq_schema_res.status_code == 200
    assert iasq_schema_res.get_json()["item_count"] == 10

    # -------------------------------------------------------------
    # Step 13 & 14: Complete and save IASQ assessment
    # -------------------------------------------------------------
    iasq_responses = {f"iasq_{i}": False for i in range(1, 11)}
    iasq_responses["iasq_1"] = True  # Poor eye contact
    iasq_responses["iasq_7"] = True  # Speech delay
    iasq_responses["iasq_8"] = True  # Hand-flapping

    iasq_payload = {
        "subject_age": "6",
        "informant_relationship": "Parent / Guardian",
        "clinical_concerns": "Delayed speech and repetitive hand-flapping.",
        "responses": iasq_responses,
    }

    iasq_sub_res = client.post("/api/questionnaire/submit", json=iasq_payload, headers=auth_header_2)
    assert iasq_sub_res.status_code == 201
    iasq_data = iasq_sub_res.get_json()
    assert iasq_data["score"] == 3
    assert "Screen Positive" in iasq_data["screen_status"]
    iasq_assessment_id = iasq_data["assessment_id"]

    # -------------------------------------------------------------
    # Step 15: Open My Results and Unified Assessment History
    # -------------------------------------------------------------
    history_res = client.get("/api/assessments/history", headers=auth_header_2)
    assert history_res.status_code == 200
    history_data = history_res.get_json()
    assert history_data["count"] >= 2
    record_ids = [r["id"] for r in history_data["assessments"]]
    assert mri_assessment_id in record_ids
    assert iasq_assessment_id in record_ids

    # -------------------------------------------------------------
    # Step 16, 17, 18: Personalized Support Centre Finder
    # -------------------------------------------------------------
    centres_res = client.get("/api/centres")
    assert centres_res.status_code == 200
    centres_data = centres_res.get_json()
    assert centres_data["count"] > 0

    # City-filtered search
    bengaluru_res = client.get("/api/centres?city=Bengaluru")
    assert bengaluru_res.status_code == 200
    bengaluru_centres = bengaluru_res.get_json()["centres"]
    assert any("Bengaluru" in c["city"] for c in bengaluru_centres)

    # -------------------------------------------------------------
    # Step 19 & 20: Generate and verify doctor-readable PDF report
    # -------------------------------------------------------------
    pdf_gen_res = client.post(
        "/api/reports/generate",
        json={"assessment_id": iasq_assessment_id},
        headers=auth_header_2,
    )
    assert pdf_gen_res.status_code == 201
    pdf_data = pdf_gen_res.get_json()
    assert pdf_data["success"] is True
    report_filename = pdf_data["filename"]

    # Verify download of the generated PDF
    dl_res = client.get(f"/api/reports/download/{report_filename}", headers=auth_header_2)
    assert dl_res.status_code == 200
    assert dl_res.mimetype == "application/pdf"
    assert len(dl_res.data) > 1000  # Valid non-empty PDF bytes

    # -------------------------------------------------------------
    # Step 21: Logout and verify protected routes are inaccessible
    # -------------------------------------------------------------
    client.post("/api/auth/logout", headers=auth_header_2)
    final_check = client.get("/api/assessments/history", headers=auth_header_2)
    assert final_check.status_code == 401
