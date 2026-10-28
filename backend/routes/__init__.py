"""Routes package initialization."""
from backend.routes.health_routes import health_bp
from backend.routes.auth_routes import auth_bp
from backend.routes.mri_routes import mri_bp
from backend.routes.questionnaire_routes import questionnaire_bp
from backend.routes.report_routes import report_bp
from backend.routes.centre_routes import centre_bp
from backend.routes.admin_routes import admin_bp
from backend.routes.assessment_routes import assessment_bp

__all__ = [
    "health_bp",
    "auth_bp",
    "mri_bp",
    "questionnaire_bp",
    "report_bp",
    "centre_bp",
    "admin_bp",
    "assessment_bp",
]
