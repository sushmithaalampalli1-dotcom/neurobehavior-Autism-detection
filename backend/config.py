"""Configuration module for NeuroBehavior-ASD application."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from project root if it exists
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


class Config:
    """Base application configuration."""

    # Project Information
    APP_NAME = "NeuroBehavior-ASD"
    APP_VERSION = "1.0.0-final"
    APP_STAGE = "Demonstration / Production Ready"

    # Security
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production-neurobehavior-asd")

    # Database
    DATABASE_PATH = BASE_DIR / "neurobehavior_asd.db"
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", f"sqlite:///{DATABASE_PATH.as_posix()}")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # CORS
    CORS_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

    # File Uploads
    UPLOAD_FOLDER = BASE_DIR / os.getenv("UPLOAD_FOLDER", "uploads/mri")
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH_MB", "250")) * 1024 * 1024
    ALLOWED_EXTENSIONS = {".nii", ".nii.gz", ".png"}

    # PDF Reports
    REPORTS_DIR = BASE_DIR / "reports" / "generated"

    # MRI Deep Learning Model
    MODEL_25D_PATH = BASE_DIR / "training" / "saved_models" / "neurobehavior_25d_cnn.keras"
    MODEL_2D_PATH = BASE_DIR / "training" / "saved_models" / "neurobehavior_2d_cnn.keras"
    MODEL_PATH = MODEL_25D_PATH if MODEL_25D_PATH.exists() else MODEL_2D_PATH
    MODEL_STATUS = os.getenv("MODEL_MODE", "trained")  # 'standby', 'trained', 'evaluation'

    # Demo mode setting (auto-seeds synthetic personas for college presentation)
    SEED_DEMO_USERS = os.getenv("SEED_DEMO_USERS", "true").lower() == "true"

    # Ensure directories exist
    UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    TESTING = False


class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    WTF_CSRF_ENABLED = False
    SEED_DEMO_USERS = False


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    TESTING = False

    # Stricter production session security
    SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "true").lower() == "true"
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"


config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
