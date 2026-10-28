"""Assessment database model."""
from datetime import datetime
from backend.extensions import db


class Assessment(db.Model):
    """Model tracking individual MRI and Questionnaire assessments."""

    __tablename__ = "assessments"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    assessment_type = db.Column(db.String(50), nullable=False)  # 'mri', 'questionnaire', 'multimodal'
    status = db.Column(db.String(50), default="model_standby")  # 'uploaded', 'processing', 'completed', 'model_standby'

    # MRI File Metadata (if applicable)
    mri_filename = db.Column(db.String(255), nullable=True)
    mri_filepath = db.Column(db.String(500), nullable=True)
    mri_dimensions = db.Column(db.String(100), nullable=True)  # e.g., "256x256x176"
    mri_voxel_size = db.Column(db.String(100), nullable=True)

    # Questionnaire Metadata (if applicable)
    questionnaire_version = db.Column(db.String(50), nullable=True)  # e.g., "Intake-V1 (Awaiting Instrument Verification)"
    questionnaire_responses = db.Column(db.Text, nullable=True)  # JSON-encoded raw intake responses

    # Model Execution Status
    model_version = db.Column(db.String(50), default="ABIDE-Classifier-Standby")
    model_inference_status = db.Column(db.String(100), default="Pipeline Standby: Model not loaded / awaiting ABIDE training")

    # Objective Evaluation Fields (No fake clinical predictions)
    # Target ABIDE labels: DX_GROUP 1 = ASD, DX_GROUP 2 = Control
    predicted_dx_group = db.Column(db.Integer, nullable=True)  # None until trained model is evaluated
    prediction_confidence = db.Column(db.Float, nullable=True)  # None until trained model is evaluated

    # Clinical & Administrative Notes
    clinical_disclaimer_accepted = db.Column(db.Boolean, default=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict:
        """Serialize assessment metadata."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "assessment_type": self.assessment_type,
            "status": self.status,
            "mri_filename": self.mri_filename,
            "mri_dimensions": self.mri_dimensions,
            "mri_voxel_size": self.mri_voxel_size,
            "questionnaire_version": self.questionnaire_version,
            "questionnaire_responses": self.questionnaire_responses,
            "model_version": self.model_version,
            "model_inference_status": self.model_inference_status,
            "predicted_dx_group": self.predicted_dx_group,
            "prediction_confidence": self.prediction_confidence,
            "clinical_disclaimer_accepted": self.clinical_disclaimer_accepted,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
