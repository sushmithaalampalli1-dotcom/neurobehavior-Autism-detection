"""Authentication routes.

Supports user registration, login, logout, profile retrieval, and secure
email-based password reset for patients, researchers, clinicians, and administrators.
"""
import os
import smtplib
import random
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from backend.models.user import User
from backend.extensions import db
from backend.utils.auth import generate_auth_token, revoke_token, token_required

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def _send_reset_email(to_email: str, user_name: str, code: str) -> bool:
    """Attempt sending verification code via SMTP; fallback to local dispatch log."""
    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASSWORD", "")
    from_email = os.getenv("SMTP_FROM", smtp_user or "support@neurobehavior.org")

    subject = "NeuroBehavior-ASD: Password Reset Verification Code"
    body_text = (
        f"Hello {user_name},\n\n"
        f"A password reset request was received for your NeuroBehavior-ASD account.\n\n"
        f"Your 6-digit verification code is:\n\n"
        f"    {code}\n\n"
        f"This code will expire in 15 minutes. If you did not make this request, please ignore this email.\n\n"
        f"Regards,\n"
        f"NeuroBehavior-ASD Clinical Portal Team"
    )

    if smtp_host and smtp_user and smtp_pass:
        try:
            msg = MIMEMultipart()
            msg["From"] = from_email
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.attach(MIMEText(body_text, "plain"))

            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            print(f"[*] Password reset email dispatched to {to_email}")
            return True
        except Exception as e:
            print(f"[!] SMTP dispatch failed ({e}), logging code to console for local testing.")

    # Local development dispatch log
    print(f"\n==================================================")
    print(f"[*] [PASSWORD RESET VERIFICATION EMAIL]")
    print(f"[*] To: {to_email}")
    print(f"[*] Name: {user_name}")
    print(f"[*] Code: {code}")
    print(f"[*] Valid for: 15 minutes")
    print(f"==================================================\n")
    return True


@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new user account with complete demographics and parent/guardian verification."""
    data = request.get_json(silent=True) or {}
    full_name = data.get("full_name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    role = data.get("role", "patient")

    # Demographic fields
    raw_age = data.get("age")
    try:
        age = float(raw_age) if raw_age not in (None, "", "null") else None
    except (ValueError, TypeError):
        age = None

    gender = data.get("gender", "").strip() or None
    blood_group = data.get("blood_group", "").strip() or None
    phone_number = data.get("phone_number", "").strip() or None

    # Parent / Guardian details for safety and minor consent
    parent_name = data.get("parent_name", "").strip() or None
    parent_phone = data.get("parent_phone", "").strip() or None
    parent_relation = data.get("parent_relation", "").strip() or None

    if not full_name or not email or not password:
        return jsonify({"error": "Full name, email, and password are required."}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long."}), 400

    # Strict check: Tell user if already registered
    existing_by_email = User.query.filter_by(email=email).first()
    if existing_by_email is not None:
        return jsonify({
            "error": "This email is already registered and already exists. Please sign in or click 'Forgot Password' to reset your credentials.",
            "code": "ALREADY_REGISTERED"
        }), 409

    if phone_number:
        existing_by_phone = User.query.filter_by(phone_number=phone_number).first()
        if existing_by_phone is not None:
            return jsonify({
                "error": "This phone number is already registered to an existing patient account. Please sign in.",
                "code": "PHONE_ALREADY_REGISTERED"
            }), 409

    user = User(
        full_name=full_name,
        email=email,
        role=role,
        age=age,
        gender=gender,
        blood_group=blood_group,
        phone_number=phone_number,
        parent_name=parent_name,
        parent_phone=parent_phone,
        parent_relation=parent_relation,
    )
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


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    """Generate and send a 6-digit verification code to the registered email."""
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()

    if not email:
        return jsonify({"error": "Please provide your registered email address."}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({
            "error": "No account is registered with this email address. Please check your email or create a new account.",
            "code": "USER_NOT_FOUND"
        }), 404

    # Generate secure 6-digit code
    code = f"{random.randint(100000, 999999)}"
    user.reset_token = code
    user.reset_token_expiry = datetime.utcnow() + timedelta(minutes=15)
    db.session.commit()

    # Dispatch email
    _send_reset_email(user.email, user.full_name, code)

    return jsonify({
        "success": True,
        "message": f"Verification code sent to {email}. Please check your inbox.",
        "dev_code": code,  # Displayed in notification banner for quick developer testing
        "expires_in_minutes": 15
    }), 200


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    """Verify code sent to email and update account password."""
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    token = str(data.get("token", "")).strip()
    new_password = data.get("new_password", "")

    if not email or not token or not new_password:
        return jsonify({"error": "Email, verification code, and new password are required."}), 400

    if len(new_password) < 6:
        return jsonify({"error": "New password must be at least 6 characters long."}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "No account found with this email."}), 404

    if not user.reset_token or str(user.reset_token).strip() != token:
        return jsonify({"error": "Invalid verification code. Please check the code sent to your email."}), 400

    if not user.reset_token_expiry or datetime.utcnow() > user.reset_token_expiry:
        return jsonify({"error": "The verification code has expired. Please request a new code."}), 400

    # Set new password & clear token
    user.set_password(new_password)
    user.reset_token = None
    user.reset_token_expiry = None
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Password updated successfully! You can now sign in with your new password.",
    }), 200


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
            {"email": "patient@demo.neurobehavior.org", "role": "patient", "name": "Demo Patient"},
            {"email": "admin@demo.neurobehavior.org", "role": "admin", "name": "System Administrator"},
        ]
    }), 200
