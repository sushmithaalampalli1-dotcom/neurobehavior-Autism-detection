"""Flask Application Factory for NeuroBehavior-ASD.

Project: Deep Learning-Based Autism Detection Using Brain Imaging Biomarkers
and Behavioral Features with Personalized Support System.
"""
import os
from flask import Flask, jsonify
from backend.config import config_by_name
from backend.extensions import db, cors
from backend.routes import (
    health_bp,
    auth_bp,
    mri_bp,
    questionnaire_bp,
    report_bp,
    centre_bp,
    admin_bp,
    assessment_bp,
)
from backend.services.centre_service import SupportCentreService


def create_app(config_name: str = None) -> Flask:
    """Create and configure the Flask application instance."""
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")

    app = Flask(__name__)
    config_obj = config_by_name.get(config_name, config_by_name["default"])
    app.config.from_object(config_obj)

    # Initialize extensions
    db.init_app(app)
    allowed_origins = "*" if app.config.get("DEBUG") else [
        app.config.get("CORS_ORIGIN", "http://localhost:5173"),
        "http://127.0.0.1:5173",
    ]
    cors.init_app(app, resources={r"/api/*": {"origins": allowed_origins}})

    # Register API blueprints
    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(mri_bp)
    app.register_blueprint(questionnaire_bp)
    app.register_blueprint(report_bp)
    app.register_blueprint(centre_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(assessment_bp)

    # Security & HTTP Error Handlers
    @app.errorhandler(413)
    def handle_payload_too_large(e):
        return jsonify({"error": "File size exceeds the 250MB maximum upload limit."}), 413

    @app.errorhandler(400)
    def handle_bad_request(e):
        return jsonify({"error": "Bad request or malformed payload."}), 400

    @app.errorhandler(404)
    def handle_not_found(e):
        return jsonify({"error": "Endpoint not found."}), 404

    @app.errorhandler(500)
    def handle_server_error(e):
        return jsonify({"error": "An internal server error occurred."}), 500

    # Serve uploaded MRI scan files
    @app.route("/api/mri/file/<path:filename>")
    def get_uploaded_mri_file(filename):
        from flask import send_from_directory
        safe_name = os.path.basename(filename)
        return send_from_directory(app.config["UPLOAD_FOLDER"], safe_name)

    # Root welcome / index route
    @app.route("/")
    def index():
        from backend.config import Config
        has_25d = Config.MODEL_25D_PATH.exists()
        return jsonify({
            "project": "NeuroBehavior-ASD",
            "full_title": "Deep Learning-Based Autism Detection Using Brain Imaging Biomarkers and Behavioral Features with Personalized Support System",
            "status": "Online (Production Ready)",
            "health_check": "/api/health",
            "documentation": "See README.md in project root",
            "mri_model": "2.5D Multi-Channel CNN (Active, Threshold=0.560)" if has_25d else "2D CNN Baseline (Active, Threshold=0.550)",
            "iasq_module": "IASQ-1.0 (10-Item Verified Clinical Instrument Active)",
            "target_classes": {
                "DX_GROUP_1": "Autism / ASD",
                "DX_GROUP_2": "Control / Non-autism"
            },
            "disclaimer": "Academic engineering research system. Not a standalone clinical diagnostic device."
        }), 200

    # Auto-initialize database tables and seed data within application context
    with app.app_context():
        db.create_all()
        # Seed initial support centres if none exist
        SupportCentreService.seed_initial_centres()
        # Seed synthetic demo personas if enabled
        if app.config.get("SEED_DEMO_USERS", True):
            _seed_demo_personas()

    return app


def _seed_demo_personas():
    """Seed synthetic demonstration accounts for college presentations."""
    from backend.models.user import User
    demo_users = [
        {"email": "patient@demo.neurobehavior.org", "name": "Demo Patient", "role": "patient", "pass": "password123"},
        {"email": "admin@demo.neurobehavior.org", "name": "System Administrator", "role": "admin", "pass": "admin123"},
    ]
    for d in demo_users:
        if not User.query.filter_by(email=d["email"]).first():
            u = User(full_name=d["name"], email=d["email"], role=d["role"])
            u.set_password(d["pass"])
            db.session.add(u)
    db.session.commit()



if __name__ == "__main__":
    app = create_app()
    port = int(os.getenv("PORT", 5000))
    host = os.getenv("HOST", "127.0.0.1")
    print(f"[*] Starting NeuroBehavior-ASD Flask Backend on http://{host}:{port}")
    app.run(host=host, port=port, debug=True)
