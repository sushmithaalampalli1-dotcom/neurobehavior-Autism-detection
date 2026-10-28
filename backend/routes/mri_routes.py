"""MRI Assessment routes.

Handles 2D/3D brain MRI scan upload, format validation, and pipeline status.
Enforces authentication, patient isolation, and strict research ethics.
"""
from flask import Blueprint, request, jsonify, current_app
from backend.services.mri_service import MRIService
from backend.models.assessment import Assessment
from backend.utils.auth import token_required

mri_bp = Blueprint("mri", __name__, url_prefix="/api/mri")


@mri_bp.route("/status", methods=["GET"])
def get_mri_status():
    """Get technical status of the MRI model pipeline."""
    status = MRIService.get_pipeline_status()
    return jsonify(status), 200


@mri_bp.route("/upload", methods=["POST"])
@token_required
def upload_mri_scan():
    """Upload and validate a brain MRI scan (2D PNG slice or 3D NIfTI volume)."""
    if "file" not in request.files:
        return jsonify({"error": "No file part in request. Please select a .png, .nii, or .nii.gz file."}), 400

    file = request.files["file"]
    if not file or file.filename == "":
        return jsonify({"error": "No file selected."}), 400

    upload_folder = current_app.config["UPLOAD_FOLDER"]
    # Strict Patient Isolation: Always bind assessment to authenticated user
    user_id = request.current_user.id

    try:
        result = MRIService.handle_mri_upload(file, upload_folder, user_id=user_id)
        return jsonify(result), 200
    except ValueError as val_err:
        return jsonify({"error": str(val_err)}), 400
    except Exception as exc:
        return jsonify({"error": f"Internal processing error: {str(exc)}"}), 500


@mri_bp.route("/history", methods=["GET"])
@token_required
def list_mri_assessments():
    """List recorded MRI assessments for the authenticated patient."""
    query = Assessment.query.filter_by(assessment_type="mri")
    # Patient isolation: regular users only see their own assessments
    if request.current_user.role != "admin":
        query = query.filter_by(user_id=request.current_user.id)
    else:
        # Admin can filter by user_id if provided
        target_uid = request.args.get("user_id", type=int)
        if target_uid:
            query = query.filter_by(user_id=target_uid)

    records = query.order_by(Assessment.created_at.desc()).limit(50).all()
    return jsonify({"assessments": [r.to_dict() for r in records]}), 200
