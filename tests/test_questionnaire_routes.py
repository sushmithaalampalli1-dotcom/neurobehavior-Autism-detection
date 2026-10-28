"""Unit tests for IASQ questionnaire assessment routes."""
import pytest


def test_questionnaire_schema(client):
    """Verify that /api/questionnaire/schema returns the 10-item IASQ specification."""
    response = client.get("/api/questionnaire/schema")
    assert response.status_code == 200
    data = response.get_json()
    assert "IASQ" in data["instrument_name"]
    assert data["item_count"] == 10
    assert len(data["items"]) == 10
    assert data["independent_from_mri"] is True
    assert data["scoring_rules"]["primary_clinical_cutoff"] == 2


def test_questionnaire_missing_auth(client):
    """Verify that submitting IASQ without authentication is rejected with 401."""
    response = client.post("/api/questionnaire/submit", json={})
    assert response.status_code == 401


def test_questionnaire_submit_incomplete_rejected(client, test_patient):
    """Verify that incomplete IASQ (missing items) is rejected with 400."""
    payload = {
        "subject_age": "6",
        "informant_relationship": "Parent / Guardian",
        "responses": {
            "iasq_1": True,
            "iasq_2": False,
            # Missing items 3-10
        },
    }
    response = client.post("/api/questionnaire/submit", json=payload, headers=test_patient["header"])
    assert response.status_code == 400
    data = response.get_json()
    assert "Incomplete assessment" in data["error"]


def test_questionnaire_submit_iasq_screen_positive(client, test_patient):
    """Verify scoring logic for screen-positive submission (score >= 2)."""
    # Answering 'Yes' to items 1, 2, 7 (score = 3 >= 2 -> Screen Positive)
    responses = {f"iasq_{i}": False for i in range(1, 11)}
    responses["iasq_1"] = True
    responses["iasq_2"] = True
    responses["iasq_7"] = True

    payload = {
        "subject_age": "5.5",
        "informant_relationship": "Parent / Guardian",
        "clinical_concerns": "Speech delay and poor eye contact.",
        "responses": responses,
    }

    response = client.post("/api/questionnaire/submit", json=payload, headers=test_patient["header"])
    assert response.status_code == 201
    data = response.get_json()
    assert data["success"] is True
    assert data["score"] == 3
    assert "Screen Positive" in data["screen_status"]
    assert "ISAA" in data["clinical_recommendation"] or "ADOS-2" in data["clinical_recommendation"]
    assert data["independent_from_mri"] is True
    assert "assessment_id" in data


def test_questionnaire_submit_iasq_screen_negative(client, test_patient):
    """Verify scoring logic for screen-negative submission (score = 0)."""
    responses = {f"iasq_{i}": False for i in range(1, 11)}

    payload = {
        "subject_age": "7",
        "informant_relationship": "Parent / Guardian",
        "responses": responses,
    }

    response = client.post("/api/questionnaire/submit", json=payload, headers=test_patient["header"])
    assert response.status_code == 201
    data = response.get_json()
    assert data["success"] is True
    assert data["score"] == 0
    assert "Screen Negative" in data["screen_status"]
