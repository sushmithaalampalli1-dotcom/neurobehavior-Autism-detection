"""Unified assessment history routes.

Combines structural MRI neuroimaging evaluations and IASQ behavioral assessments
into a unified chronological patient history with strict privacy controls.
"""
from flask import Blueprint, request, jsonify
from backend.models.assessment import Assessment
from backend.utils.auth import token_required

assessment_bp = Blueprint("assessments", __name__, url_prefix="/api/assessments")


@assessment_bp.route("/history", methods=["GET"])
@token_required
def get_unified_history():
    """Retrieve all assessments (MRI + Questionnaire) for the authenticated patient."""
    current_user = request.current_user
    query = Assessment.query

    if current_user.role != "admin":
        query = query.filter_by(user_id=current_user.id)
    else:
        target_uid = request.args.get("user_id", type=int)
        if target_uid:
            query = query.filter_by(user_id=target_uid)

    # Optional filter by assessment_type
    atype = request.args.get("type")
    if atype:
        query = query.filter_by(assessment_type=atype)

    records = query.order_by(Assessment.created_at.desc()).limit(100).all()
    return jsonify({
        "count": len(records),
        "assessments": [r.to_dict() for r in records],
    }), 200
