"""Admin dashboard routes with role-based access control."""
from flask import Blueprint, jsonify
from backend.models.user import User
from backend.models.assessment import Assessment
from backend.models.support_centre import SupportCentre
from backend.services.mri_service import MRIService
from backend.preprocessing.mri_preprocessor import NIBABEL_AVAILABLE
from backend.services.pdf_service import PDFReportService
from backend.utils.auth import admin_required

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@admin_bp.route("/overview", methods=["GET"])
@admin_required
def get_overview():
    """Retrieve operational statistics and health checks for the admin panel. Requires admin role."""
    total_users = User.query.count()
    total_assessments = Assessment.query.count()
    total_centres = SupportCentre.query.count()
    mri_count = Assessment.query.filter_by(assessment_type="mri").count()
    questionnaire_count = Assessment.query.filter_by(assessment_type="questionnaire").count()

    from backend.config import Config
    mri_status = "ACTIVE (2.5D Multi-Channel CNN Trained)" if Config.MODEL_25D_PATH.exists() else "ACTIVE (Baseline 2D CNN)"

    return jsonify({
        "metrics": {
            "total_users": total_users,
            "total_assessments": total_assessments,
            "mri_assessments": mri_count,
            "questionnaire_assessments": questionnaire_count,
            "registered_centres": total_centres,
        },
        "system_status": {
            "mri_model_pipeline": mri_status,
            "iasq_behavioral_engine": "ACTIVE (IASQ-1.0 10-Item Clinical Instrument)",
            "nibabel_preprocessor": "Available" if NIBABEL_AVAILABLE else "Standby",
            "pdf_generator": "Available" if PDFReportService.is_available() else "Standby",
            "database_engine": "SQLite (Development/Milestone 1)",
            "maps_service": "Leaflet + OpenStreetMap Active",
        },
        "abide_configuration": {
            "datasets": ["ABIDE I", "ABIDE II"],
            "target_classes": {
                "DX_GROUP_1": "Autism Spectrum Disorder (ASD)",
                "DX_GROUP_2": "Control / Typical Development",
            },
            "validation_threshold": 0.560,
            "severity_status": "Omitted until clinically evaluated labels exist",
        },
    }), 200
