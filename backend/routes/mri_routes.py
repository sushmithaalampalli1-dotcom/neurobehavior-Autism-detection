"""MRI Assessment routes.

Handles 2D/3D brain MRI scan upload, format validation, and pipeline status.
Enforces authentication, patient isolation, and strict research ethics.
"""
import os
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from backend.services.mri_service import MRIService
from backend.models.assessment import Assessment
from backend.utils.auth import token_required

mri_bp = Blueprint("mri", __name__, url_prefix="/api/mri")


@mri_bp.route("/status", methods=["GET"])
def get_mri_status():
    """Get technical status of the MRI model pipeline."""
    status = MRIService.get_pipeline_status()
    return jsonify(status), 200


@mri_bp.route("/samples", methods=["GET"])
def get_sample_scans():
    """Returns curated demo brain MRI scans for 1-click clinical testing."""
    samples = [
        {
            "id": "asd_28802",
            "filename": "sample_asd_28802.png",
            "label": "Sample ASD Scan (Subject 28802)",
            "expected": "Autism",
            "format": "2D PNG Axial Slice",
            "source": "ABIDE Repository",
        },
        {
            "id": "control_28749",
            "filename": "sample_control_28749.png",
            "label": "Sample Control Scan (Subject 28749)",
            "expected": "Non Autism",
            "format": "2D PNG Axial Slice",
            "source": "ABIDE Repository",
        },
        {
            "id": "asd_28684",
            "filename": "sample_asd_28684.png",
            "label": "Sample ASD Scan (Subject 28684)",
            "expected": "Autism",
            "format": "2D PNG Axial Slice",
            "source": "ABIDE Repository",
        },
        {
            "id": "control_28950",
            "filename": "sample_control_28950.png",
            "label": "Sample Control Scan (Subject 28950)",
            "expected": "Non Autism",
            "format": "2D PNG Axial Slice",
            "source": "ABIDE Repository",
        },
    ]
    return jsonify({"samples": samples}), 200


@mri_bp.route("/sample/<filename>", methods=["GET"])
def download_sample_scan(filename):
    """Download a raw demo sample scan file for test analysis."""
    demo_dir = os.path.join(os.path.dirname(current_app.root_path), "demo_samples")
    if not os.path.exists(os.path.join(demo_dir, filename)):
        return jsonify({"error": f"Sample scan '{filename}' not found."}), 404
    return send_from_directory(demo_dir, filename, mimetype="image/png")


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
