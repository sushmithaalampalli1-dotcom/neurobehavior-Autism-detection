"""Flask Application Factory for NeuroBehavior-ASD.

Project: Deep Learning-Based Autism Detection Using Brain Imaging Biomarkers
and Behavioral Features with Personalized Support System.
"""
import os
from flask import Flask, jsonify
from backend.config import config_by_name, BASE_DIR
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
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})

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

    # Static frontend SPA routing (Serves built React assets in production)
    frontend_dist = BASE_DIR / "frontend" / "dist"

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend_or_status(path):
        from flask import send_from_directory
        # Prevent intercepting /api routes if an endpoint was 404
        if path.startswith("api/"):
            return jsonify({"error": f"API endpoint '/{path}' not found."}), 404

        # If in testing mode or JSON explicitly requested, return API status metadata
        if app.config.get("TESTING") or request.headers.get("Accept") == "application/json":
            return jsonify({
                "project": "NeuroBehavior-ASD",
                "full_title": "Deep Learning-Based Autism Detection Using Brain Imaging Biomarkers and Behavioral Features with Personalized Support System",
                "status": "Online (Production Ready)",
                "target_classes": ["Autism Spectrum Disorder (ASD)", "Typically Developing (Control)"],
                "health_check": "/api/health",
                "documentation": "See README.md in project root",
                "disclaimer": "Academic engineering research system. Not a standalone clinical diagnostic device."
            }), 200

        # If frontend build exists, serve React SPA
        if frontend_dist.exists() and (frontend_dist / "index.html").exists():
            target_file = frontend_dist / path
            if path and target_file.exists() and target_file.is_file():
                return send_from_directory(frontend_dist, path)
            return send_from_directory(frontend_dist, "index.html")

        # Fallback to JSON status if no frontend build present
        return jsonify({
            "project": "NeuroBehavior-ASD",
            "full_title": "Deep Learning-Based Autism Detection Using Brain Imaging Biomarkers and Behavioral Features with Personalized Support System",
            "status": "Online (Production Ready)",
            "target_classes": ["Autism Spectrum Disorder (ASD)", "Typically Developing (Control)"],
            "health_check": "/api/health",
            "documentation": "See README.md in project root",
            "disclaimer": "Academic engineering research system. Not a standalone clinical diagnostic device."
        }), 200

    # Auto-initialize database tables and seed data within application context
    with app.app_context():
        _run_db_migrations()
        db.create_all()
        # Seed initial support centres if none exist
        SupportCentreService.seed_initial_centres()
        # Seed synthetic demo personas if enabled
        if app.config.get("SEED_DEMO_USERS", True):
            _seed_demo_personas()

    return app


def _run_db_migrations():
    """Ensure newly introduced User demographic and reset columns exist in SQLite."""
    from sqlalchemy import text
    try:
        with db.engine.connect() as conn:
            existing_cols = [
                row[1] for row in conn.execute(text("PRAGMA table_info(users)")).fetchall()
            ]
            new_cols = [
                ("age", "REAL"),
                ("gender", "TEXT"),
                ("blood_group", "TEXT"),
                ("phone_number", "TEXT"),
                ("parent_name", "TEXT"),
                ("parent_phone", "TEXT"),
                ("parent_relation", "TEXT"),
                ("reset_token", "TEXT"),
                ("reset_token_expiry", "TIMESTAMP"),
            ]
            for col_name, col_type in new_cols:
                if col_name not in existing_cols:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))

            # Ensure support_centres rating & review_count exist
            sc_cols = [
                row[1] for row in conn.execute(text("PRAGMA table_info(support_centres)")).fetchall()
            ]
            if "rating" not in sc_cols:
                conn.execute(text("ALTER TABLE support_centres ADD COLUMN rating FLOAT DEFAULT 4.8"))
            if "review_count" not in sc_cols:
                conn.execute(text("ALTER TABLE support_centres ADD COLUMN review_count INTEGER DEFAULT 500"))

            conn.commit()
    except Exception as e:
        print("[*] DB migration check notice:", e)


def _seed_demo_personas():
    """Seed synthetic demonstration accounts for college presentations with clean assessment slate."""
    from backend.models.user import User
    from backend.models.assessment import Assessment
    demo_users = [
        {
            "email": "patient@demo.neurobehavior.org",
            "name": "Demo Patient",
            "role": "patient",
            "pass": "password123",
            "age": 21.0,
            "gender": "Female",
            "blood_group": "B-",
            "phone": "+91 98765 43210",
            "parent_name": "Rajesh Sharma",
            "parent_phone": "+91 91234 56789",
            "parent_relation": "Father",
        },
        {"email": "admin@demo.neurobehavior.org", "name": "System Administrator", "role": "admin", "pass": "admin123"},
    ]
    for d in demo_users:
        u = User.query.filter_by(email=d["email"]).first()
        if not u:
            u = User(full_name=d["name"], email=d["email"], role=d["role"])
            u.set_password(d["pass"])
            if d.get("age"):
                u.age = d["age"]
            if d.get("gender"):
                u.gender = d["gender"]
            if d.get("blood_group"):
                u.blood_group = d["blood_group"]
            if d.get("phone"):
                u.phone_number = d["phone"]
            if d.get("parent_name"):
                u.parent_name = d["parent_name"]
            if d.get("parent_phone"):
                u.parent_phone = d["parent_phone"]
            if d.get("parent_relation"):
                u.parent_relation = d["parent_relation"]
            db.session.add(u)
            db.session.flush()
        else:
            # Update existing demo persona with complete registration details
            if d.get("age") and not u.age:
                u.age = d["age"]
            if d.get("gender") and not u.gender:
                u.gender = d["gender"]
            if d.get("blood_group") and not u.blood_group:
                u.blood_group = d["blood_group"]
            if d.get("phone") and not u.phone_number:
                u.phone_number = d["phone"]
            if d.get("parent_name") and not u.parent_name:
                u.parent_name = d["parent_name"]
            if d.get("parent_phone") and not u.parent_phone:
                u.parent_phone = d["parent_phone"]
            if d.get("parent_relation") and not u.parent_relation:
                u.parent_relation = d["parent_relation"]
        # Ensure demo patient starts with an empty assessment slate so no stale MRI/report is shown
        if u and u.role == "patient":
            Assessment.query.filter_by(user_id=u.id).delete()
    db.session.commit()



if __name__ == "__main__":
    app = create_app()
    port = int(os.getenv("PORT", 5000))
    host = os.getenv("HOST", "127.0.0.1")
    print(f"[*] Starting NeuroBehavior-ASD Flask Backend on http://{host}:{port}")
    app.run(host=host, port=port, debug=True)
