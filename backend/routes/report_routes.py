"""Report generation and download routes with strict patient access control."""
from pathlib import Path
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from backend.services.pdf_service import PDFReportService
from backend.models.assessment import Assessment
from backend.utils.auth import token_required

report_bp = Blueprint("reports", __name__, url_prefix="/api/reports")


@report_bp.route("/generate", methods=["POST"])
@token_required
def generate_report():
    """Generate a doctor-readable PDF assessment summary for the authenticated patient."""
    data = request.get_json(silent=True) or {}
    assessment_id = data.get("assessment_id")
    current_user = request.current_user

    assessment_data = {
        "id": f"NB-ASD-{assessment_id or '001'}",
        "assessment_type": data.get("assessment_type", "Comprehensive Clinical Screening Summary"),
        "mri_filename": data.get("mri_filename", "Awaiting Scan Upload"),
        "mri_dimensions": data.get("mri_dimensions", "N/A"),
        "questionnaire_version": data.get("questionnaire_version", "IASQ-1.0 (Standard Caregiver Screening)"),
        "patient_name": data.get("patient_name") or current_user.full_name,
        "patient_email": current_user.email,
        "patient_id": current_user.id,
        "patient_phone": getattr(current_user, "phone_number", None),
        "parent_name": data.get("parent_name") or getattr(current_user, "parent_name", None),
        "parent_phone": data.get("parent_phone") or getattr(current_user, "parent_phone", None),
        "parent_relation": data.get("parent_relation") or getattr(current_user, "parent_relation", None),
        "age": data.get("age") or data.get("patient_age") or getattr(current_user, "age", None) or 21.0,
        "gender": data.get("gender") or data.get("patient_gender") or getattr(current_user, "gender", None) or "Female",
        "blood_group": data.get("blood_group") or getattr(current_user, "blood_group", None) or "B-",
    }

    if assessment_id:
        from backend.extensions import db
        record = db.session.get(Assessment, assessment_id)
        if not record:
            return jsonify({"error": "Assessment record not found."}), 404

        # Security: Prevent accessing another patient's assessment
        if current_user.role != "admin" and record.user_id != current_user.id:
            return jsonify({
                "error": "Access denied. You do not have permission to generate reports for this assessment."
            }), 403

        assessment_data.update(record.to_dict())
        if data.get("patient_name"):
            assessment_data["patient_name"] = data["patient_name"]
        if data.get("age") or data.get("patient_age"):
            assessment_data["age"] = data.get("age") or data.get("patient_age")
        if data.get("gender") or data.get("patient_gender"):
            assessment_data["gender"] = data.get("gender") or data.get("patient_gender")
        if data.get("blood_group"):
            assessment_data["blood_group"] = data["blood_group"]
        assessment_data["patient_email"] = current_user.email

        # Cross-populate complementary modality if present for this patient
        if record.assessment_type == "mri":
            latest_q = Assessment.query.filter(
                Assessment.user_id == current_user.id,
                Assessment.assessment_type.in_(["questionnaire", "iasq"])
            ).order_by(Assessment.created_at.desc()).first()
            if latest_q:
                assessment_data["questionnaire_responses"] = latest_q.questionnaire_responses
                if latest_q.notes:
                    q_notes = latest_q.notes
                    cur_notes = assessment_data.get("notes") or ""
                    assessment_data["notes"] = f"{cur_notes} | {q_notes}".strip(" |")
        elif record.assessment_type in ["questionnaire", "iasq"]:
            latest_m = Assessment.query.filter_by(
                user_id=current_user.id,
                assessment_type="mri"
            ).order_by(Assessment.created_at.desc()).first()
            if latest_m:
                assessment_data["mri_filename"] = latest_m.mri_filename
                assessment_data["mri_dimensions"] = latest_m.mri_dimensions
                assessment_data["predicted_dx_group"] = latest_m.predicted_dx_group
                assessment_data["prediction_confidence"] = latest_m.prediction_confidence
    else:
        # Auto-synthesize latest assessment data for current patient
        latest_m = Assessment.query.filter_by(
            user_id=current_user.id,
            assessment_type="mri"
        ).order_by(Assessment.created_at.desc()).first()
        latest_q = Assessment.query.filter(
            Assessment.user_id == current_user.id,
            Assessment.assessment_type.in_(["questionnaire", "iasq"])
        ).order_by(Assessment.created_at.desc()).first()

        # Strict validation: If patient has entered nothing, do NOT generate a dummy report
        if not latest_m and not latest_q:
            return jsonify({
                "error": "No assessment data available to generate a report. Please upload a brain MRI scan or submit an IASQ questionnaire first."
            }), 400

        if latest_m:
            assessment_data.update(latest_m.to_dict())
            assessment_id = latest_m.id
        if latest_q:
            assessment_data["questionnaire_responses"] = latest_q.questionnaire_responses
            if latest_q.notes:
                cur_notes = assessment_data.get("notes") or ""
                assessment_data["notes"] = f"{cur_notes} | {latest_q.notes}".strip(" |")
            if not assessment_id:
                assessment_id = latest_q.id

        assessment_data["id"] = f"NB-ASD-{assessment_id or '001'}"
        if data.get("patient_name"):
            assessment_data["patient_name"] = data["patient_name"]
        else:
            assessment_data["patient_name"] = current_user.full_name
        assessment_data["patient_email"] = current_user.email

    output_dir = current_app.config["REPORTS_DIR"]
    report_filename = f"NeuroBehavior_Report_User{current_user.id}_A{assessment_id or '0'}.pdf"

    try:
        report_path = PDFReportService.generate_assessment_report(
            assessment_data, output_dir, report_filename=report_filename
        )
        return jsonify({
            "success": True,
            "filename": report_path.name,
            "report_filename": report_path.name,
            "download_url": f"/api/reports/download/{report_path.name}",
            "generated_at": report_path.stat().st_mtime,
            "status": "Doctor-readable summary generated",
        }), 201
    except Exception as exc:
        return jsonify({"error": f"Failed to generate PDF: {str(exc)}"}), 500


@report_bp.route("/download/<path:filename>", methods=["GET"])
@token_required
def download_report(filename):
    """Download a generated PDF report with patient ownership enforcement."""
    # Sanitize filename against directory traversal
    safe_name = Path(filename).name
    if ".." in filename or safe_name != filename:
        return jsonify({"error": "Invalid filename."}), 400

    current_user = request.current_user

    # Security: Verify ownership unless admin
    user_prefix = f"User{current_user.id}_"
    if current_user.role != "admin" and user_prefix not in safe_name:
        return jsonify({
            "error": "Access denied. You do not have permission to download another patient's report."
        }), 403

    output_dir = current_app.config["REPORTS_DIR"]
    file_path = Path(output_dir) / safe_name
    if not file_path.exists():
        return jsonify({"error": "Requested report file does not exist."}), 404

    return send_from_directory(output_dir, safe_name, as_attachment=True)


@report_bp.route("/list", methods=["GET"])
@token_required
def list_reports():
    """List available generated reports for the authenticated patient."""
    output_dir = Path(current_app.config["REPORTS_DIR"])
    reports = []
    current_user = request.current_user
    user_prefix = f"User{current_user.id}_"

    if output_dir.exists():
        for file in output_dir.glob("*.pdf"):
            # Filter reports to only those owned by current user (or all if admin)
            if current_user.role == "admin" or user_prefix in file.name:
                reports.append({
                    "filename": file.name,
                    "size_bytes": file.stat().st_size,
                    "modified_at": file.stat().st_mtime,
                    "download_url": f"/api/reports/download/{file.name}",
                })
    return jsonify({"reports": reports}), 200
