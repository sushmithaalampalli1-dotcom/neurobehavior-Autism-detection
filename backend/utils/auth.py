"""Authentication and authorization utilities for NeuroBehavior-ASD.

Provides cryptographically signed timed tokens, session verification,
role-based access control, and token revocation.
"""
import uuid
from functools import wraps
from typing import Optional, Dict, Any
from flask import request, jsonify, current_app
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from backend.extensions import db
from backend.models.user import User

# In-memory blacklist of revoked tokens (cleared on logout)
_REVOKED_TOKENS = set()


def get_serializer() -> URLSafeTimedSerializer:
    """Return timed serializer using application secret key."""
    secret_key = current_app.config.get("SECRET_KEY", "dev-secret-key-change-in-production")
    return URLSafeTimedSerializer(secret_key, salt="neurobehavior-auth-salt")


def generate_auth_token(user_id: int, role: str) -> str:
    """Generate a cryptographically signed unique auth token."""
    serializer = get_serializer()
    return serializer.dumps({
        "user_id": user_id,
        "role": role,
        "nonce": uuid.uuid4().hex,  # Guarantees token uniqueness across logins
    })


def verify_auth_token(token: str, max_age: int = 86400) -> Optional[Dict[str, Any]]:
    """Verify auth token validity, signature, and expiration (default 24h)."""
    if not token or token in _REVOKED_TOKENS:
        return None
    serializer = get_serializer()
    try:
        data = serializer.loads(token, max_age=max_age)
        return data
    except (SignatureExpired, BadSignature):
        return None


def revoke_token(token: str) -> None:
    """Add a token to the revoked tokens blacklist."""
    if token:
        _REVOKED_TOKENS.add(token)


def token_required(f):
    """Decorator to enforce authentication on protected endpoints."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        token = None

        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()

        if not token:
            # Fallback to query param or form data for direct file downloads
            token = request.args.get("token") or request.form.get("token")

        if not token:
            return jsonify({
                "error": "Authentication required. Missing Bearer token in Authorization header."
            }), 401

        payload = verify_auth_token(token)
        if not payload:
            return jsonify({
                "error": "Invalid, expired, or revoked authentication token. Please log in again."
            }), 401

        user = db.session.get(User, payload.get("user_id"))
        if not user:
            return jsonify({"error": "User account no longer exists."}), 401

        # Attach authenticated user to request context
        request.current_user = user
        request.current_token = token
        return f(*args, **kwargs)

    return decorated


def admin_required(f):
    """Decorator to enforce administrator role access."""
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        if getattr(request, "current_user", None) is None or request.current_user.role != "admin":
            return jsonify({
                "error": "Access denied. Administrator privileges required."
            }), 403
        return f(*args, **kwargs)

    return decorated
