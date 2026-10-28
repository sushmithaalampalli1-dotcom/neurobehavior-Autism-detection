"""User database model."""
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from backend.extensions import db


class User(db.Model):
    """User account model for patients, researchers, and clinicians."""

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(30), default="patient")  # patient, researcher, clinician, admin
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    assessments = db.relationship("Assessment", backref="user", lazy=True, cascade="all, delete-orphan")

    def set_password(self, password: str) -> None:
        """Hash and store the user's password."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Verify the user's password."""
        return check_password_hash(self.password_hash, password)

    def to_dict(self) -> dict:
        """Serialize user object without sensitive fields."""
        return {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
