"""Pytest shared fixtures for NeuroBehavior-ASD test suite."""
import pytest
from backend.app import create_app
from backend.extensions import db
from backend.models.user import User
from backend.utils.auth import generate_auth_token


@pytest.fixture
def app():
    """Create application configured for testing."""
    app = create_app(config_name="testing")
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def test_patient(app):
    """Create a persistent test patient user."""
    with app.app_context():
        user = User.query.filter_by(email="testpatient@example.org").first()
        if not user:
            user = User(
                full_name="Test Patient",
                email="testpatient@example.org",
                role="patient",
            )
            user.set_password("SecurePassword123!")
            db.session.add(user)
            db.session.commit()
            db.session.refresh(user)

        token = generate_auth_token(user.id, user.role)
        return {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "token": token,
            "header": {"Authorization": f"Bearer {token}"},
        }


@pytest.fixture
def other_patient(app):
    """Create a second distinct patient for isolation testing."""
    with app.app_context():
        user = User.query.filter_by(email="otherpatient@example.org").first()
        if not user:
            user = User(
                full_name="Other Patient",
                email="otherpatient@example.org",
                role="patient",
            )
            user.set_password("SecurePassword123!")
            db.session.add(user)
            db.session.commit()
            db.session.refresh(user)

        token = generate_auth_token(user.id, user.role)
        return {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "token": token,
            "header": {"Authorization": f"Bearer {token}"},
        }


@pytest.fixture
def test_admin(app):
    """Create a persistent test administrator user."""
    with app.app_context():
        admin = User.query.filter_by(email="testadmin@example.org").first()
        if not admin:
            admin = User(
                full_name="System Admin",
                email="testadmin@example.org",
                role="admin",
            )
            admin.set_password("AdminSecurePass123!")
            db.session.add(admin)
            db.session.commit()
            db.session.refresh(admin)

        token = generate_auth_token(admin.id, admin.role)
        return {
            "id": admin.id,
            "full_name": admin.full_name,
            "email": admin.email,
            "role": admin.role,
            "token": token,
            "header": {"Authorization": f"Bearer {token}"},
        }
