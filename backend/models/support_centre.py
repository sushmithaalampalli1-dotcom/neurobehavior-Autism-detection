"""Support Centre database model."""
from datetime import datetime
from backend.extensions import db


class SupportCentre(db.Model):
    """Model representing autism diagnosis and therapy support centres."""

    __tablename__ = "support_centres"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    facility_type = db.Column(db.String(100), default="Developmental & Behavioral Pediatrics")
    address = db.Column(db.String(255), nullable=False)
    city = db.Column(db.String(100), nullable=False, index=True)
    state = db.Column(db.String(100), nullable=False)
    postal_code = db.Column(db.String(20), nullable=True)
    country = db.Column(db.String(100), default="India")
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    phone = db.Column(db.String(50), nullable=True)
    email = db.Column(db.String(120), nullable=True)
    website = db.Column(db.String(255), nullable=True)
    services_offered = db.Column(db.Text, nullable=True)  # Comma-separated or description
    is_verified = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict:
        """Serialize support centre object."""
        return {
            "id": self.id,
            "name": self.name,
            "facility_type": self.facility_type,
            "address": self.address,
            "city": self.city,
            "state": self.state,
            "postal_code": self.postal_code,
            "country": self.country,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "phone": self.phone,
            "email": self.email,
            "website": self.website,
            "services_offered": [s.strip() for s in (self.services_offered or "").split(",") if s.strip()],
            "is_verified": self.is_verified,
        }
