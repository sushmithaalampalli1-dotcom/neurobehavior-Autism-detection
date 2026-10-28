"""Authentication routes.

Supports user registration, login, logout, and profile retrieval for
patients, researchers, clinicians, and administrators.
"""
from flask import Blueprint, request, jsonify
from backend.models.user import User
from backend.extensions import db
from backend.utils.auth import generate_auth_token, revoke_token, token_required

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new user account."""
    data = request.get_json(silent=True) or {}
    full_name = data.get("full_name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    role = data.get("role", "patient")

    if not full_name or not email or not password:
        return jsonify({"error": "Full name, email, and password are required."}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long."}), 400

    if User.query.filter_by(email=email).first() is not None:
        return jsonify({"error": "A user with this email address already exists."}), 409

    user = User(full_name=full_name, email=email, role=role)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    token = generate_auth_token(user.id, user.role)

    return jsonify({
        "success": True,
        "message": "User registered successfully.",
        "user": user.to_dict(),
        "token": token,
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticate existing user credentials and return signed token."""
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password."}), 401

    token = generate_auth_token(user.id, user.role)

    return jsonify({
        "success": True,
        "message": "Authentication successful.",
        "user": user.to_dict(),
        "token": token,
    }), 200


@auth_bp.route("/me", methods=["GET"])
@token_required
def get_current_user_profile():
    """Return profile data for the currently authenticated user."""
    return jsonify({
        "success": True,
        "user": request.current_user.to_dict(),
    }), 200


@auth_bp.route("/logout", methods=["POST"])
@token_required
def logout():
    """Revoke active authentication token."""
    token = getattr(request, "current_token", None)
    if token:
        revoke_token(token)
    return jsonify({
        "success": True,
        "message": "Logged out successfully. Token invalidated.",
    }), 200


@auth_bp.route("/demo-users", methods=["GET"])
def get_demo_users():
    """Return available demo personas for quick prototype navigation."""
    return jsonify({
        "personas": [
            {"email": "patient@demo.neurobehavior.org", "role": "patient", "name": "Patient / Parent User"},
            {"email": "clinician@demo.neurobehavior.org", "role": "clinician", "name": "Dr. Sarah Chen, MD"},
            {"email": "admin@demo.neurobehavior.org", "role": "admin", "name": "System Administrator"},
        ]
    }), 200
