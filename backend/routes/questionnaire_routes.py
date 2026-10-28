"""Questionnaire assessment routes: Indian Autism Screening Questionnaire (IASQ).

Provides schema, submission, and history for the standardized 10-item IASQ.
Enforces authentication, patient isolation, and strict scoring integrity.
"""
from flask import Blueprint, request, jsonify
from backend.services.questionnaire_service import QuestionnaireService
from backend.models.assessment import Assessment
from backend.utils.auth import token_required

questionnaire_bp = Blueprint("questionnaire", __name__, url_prefix="/api/questionnaire")


@questionnaire_bp.route("/schema", methods=["GET"])
def get_schema():
    """Retrieve official IASQ metadata, 10 items, and scoring rules."""
    schema = QuestionnaireService.get_questionnaire_schema()
    return jsonify(schema), 200


@questionnaire_bp.route("/submit", methods=["POST"])
@token_required
def submit_questionnaire():
    """Submit and score IASQ behavioral screening. Enforces patient isolation."""
    data = request.get_json(silent=True) or {}
    user_id = request.current_user.id

    try:
        result = QuestionnaireService.submit_iasq_assessment(data, user_id=user_id)
        return jsonify(result), 201
    except ValueError as val_err:
        return jsonify({"error": str(val_err)}), 400
    except Exception as exc:
        return jsonify({"error": f"Failed to record IASQ assessment: {str(exc)}"}), 500


@questionnaire_bp.route("/history", methods=["GET"])
@token_required
def list_questionnaires():
    """List recorded questionnaire assessments for the authenticated patient."""
    query = Assessment.query.filter_by(assessment_type="questionnaire")
    if request.current_user.role != "admin":
        query = query.filter_by(user_id=request.current_user.id)
    else:
        target_uid = request.args.get("user_id", type=int)
        if target_uid:
            query = query.filter_by(user_id=target_uid)

    records = query.order_by(Assessment.created_at.desc()).limit(50).all()
    return jsonify({"assessments": [r.to_dict() for r in records]}), 200
