"""Health check endpoint.

Provides system status, database connectivity verification,
and pipeline readiness metadata.
"""
from datetime import datetime
from flask import Blueprint, jsonify, current_app
from backend.extensions import db
from backend.services.mri_service import MRIService
from backend.services.pdf_service import PDFReportService
from backend.preprocessing.mri_preprocessor import NIBABEL_AVAILABLE

health_bp = Blueprint("health", __name__, url_prefix="/api/health")


@health_bp.route("", methods=["GET"])
@health_bp.route("/", methods=["GET"])
def check_health():
    """Verify backend status, database connection, and subsystem capabilities."""
    db_status = "connected"
    try:
        # Test database connection with simple query
        db.session.execute(db.text("SELECT 1"))
    except Exception as exc:
        db_status = f"error: {str(exc)}"

    return jsonify({
        "status": "ok",
        "app_name": current_app.config.get("APP_NAME", "NeuroBehavior-ASD"),
        "app_version": current_app.config.get("APP_VERSION", "0.1.0"),
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "database": db_status,
        "subsystems": {
            "mri_preprocessing_nibabel": "available" if NIBABEL_AVAILABLE else "standby_deferred",
            "pdf_reportlab": "available" if PDFReportService.is_available() else "standby_deferred",
            "mri_deep_learning_model": "standby (Awaiting ABIDE I & II training)",
            "questionnaire_scoring": "standby (Awaiting clinical instrument verification)",
        },
        "mri_pipeline": MRIService.get_pipeline_status(),
        "disclaimer": (
            "NeuroBehavior-ASD is an academic engineering project for research purposes only. "
            "It does not claim clinical diagnostic accuracy and must not be used as medical advice."
        ),
    }), 200
