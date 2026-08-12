"""
Tests for v2.0 features:
  - Hospital registration (one-shot endpoint)
  - MASTER_ADMIN role RBAC guard
  - Subscription upsert
  - Support query submit and resolve
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import get_db, Base
from app.models import Subscription, SupportQuery
from app.models.user import User, UserRole
from app.core.security import get_password_hash, create_access_token

# ── Test DB setup ──
SQLALCHEMY_TEST_URL = "sqlite:///./test_v2.db"
engine = create_engine(SQLALCHEMY_TEST_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


client = TestClient(app)


# ────────────────────────────────────────────────
#  Helpers
# ────────────────────────────────────────────────

def make_master_admin_token(db):
    """Insert a MASTER_ADMIN user and return a valid JWT."""
    import uuid
    uid = str(uuid.uuid4())
    # MASTER_ADMIN has no clinic — use a well-known sentinel string
    # (clinic_id FK is nullable in model but may be NOT NULL in older SQLite schema)
    admin = User(
        id=uid,
        clinic_id="PRESCRIPTO-HQ",  # sentinel — no real clinic row
        full_name="Test Admin",
        email=f"admin_{uid[:6]}@prescripto.app",
        hashed_password=get_password_hash("adminpass"),
        role=UserRole.MASTER_ADMIN,
        is_active=True,
        is_store_admin=False
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return create_access_token(subject=admin.id, role="MASTER_ADMIN"), admin


# ────────────────────────────────────────────────
#  1. Hospital Register
# ────────────────────────────────────────────────

def test_hospital_register_creates_clinic_and_doctor():
    """POST /auth/hospital-register should return a JWT and create a clinic."""
    payload = {
        "full_name": "Dr. V2 Test",
        "email": "v2test@clinic.com",
        "password": "secure123",
        "license_number": "MH-12345",
        "clinic_name": "V2 Test Hospital",
        "clinic_address": "123 Test Street, Pune"
    }
    response = client.post("/api/v1/auth/hospital-register", json=payload)
    assert response.status_code == 201, response.text
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "DOCTOR"
    assert data["clinic_name"] == "V2 Test Hospital"
    assert data["doctor_name"] == "Dr. V2 Test"


def test_hospital_register_duplicate_email_fails():
    """Duplicate email should return 400."""
    payload = {
        "full_name": "Dr. Duplicate",
        "email": "v2test@clinic.com",   # same as above
        "password": "other123",
        "clinic_name": "Duplicate Clinic",
    }
    response = client.post("/api/v1/auth/hospital-register", json=payload)
    assert response.status_code == 400


# ────────────────────────────────────────────────
#  2. MASTER_ADMIN RBAC
# ────────────────────────────────────────────────

def test_admin_analytics_requires_master_admin():
    """Non-admin token should get 403 on /admin/analytics."""
    # Register a regular doctor first
    payload = {
        "full_name": "Dr. Regular",
        "email": "regular@clinic.com",
        "password": "pass123",
        "clinic_name": "Regular Clinic",
    }
    reg_resp = client.post("/api/v1/auth/hospital-register", json=payload)
    assert reg_resp.status_code == 201
    token = reg_resp.json()["access_token"]

    resp = client.get(
        "/api/v1/admin/analytics",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 403


def test_admin_analytics_succeeds_with_master_admin():
    """MASTER_ADMIN token should get 200 on /admin/analytics."""
    db = TestingSessionLocal()
    token, _ = make_master_admin_token(db)
    db.close()

    resp = client.get(
        "/api/v1/admin/analytics",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "total_hospitals" in data
    assert "open_queries" in data
    assert "active_subscriptions" in data


# ────────────────────────────────────────────────
#  3. Subscription Management
# ────────────────────────────────────────────────

def test_upsert_subscription():
    """Admin should be able to set/update a clinic's subscription plan."""
    # Register a clinic to get a clinic_id
    payload = {
        "full_name": "Dr. Sub Test",
        "email": "subtest@clinic.com",
        "password": "sub123",
        "clinic_name": "Sub Test Clinic",
    }
    reg_resp = client.post("/api/v1/auth/hospital-register", json=payload)
    assert reg_resp.status_code == 201
    clinic_id = reg_resp.json()["clinic_id"]

    db = TestingSessionLocal()
    admin_token, _ = make_master_admin_token(db)
    db.close()

    sub_payload = {"plan": "PRO", "is_active": True}
    resp = client.post(
        f"/api/v1/admin/subscriptions/{clinic_id}",
        json=sub_payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["plan"] == "PRO"
    assert data["is_active"] is True


# ────────────────────────────────────────────────
#  4. Support Query Flow
# ────────────────────────────────────────────────

def test_support_query_submit_and_resolve():
    """Doctor submits a query; admin resolves it."""
    # Register a doctor
    payload = {
        "full_name": "Dr. Query Test",
        "email": "querytest@clinic.com",
        "password": "query123",
        "clinic_name": "Query Test Clinic",
    }
    reg_resp = client.post("/api/v1/auth/hospital-register", json=payload)
    assert reg_resp.status_code == 201
    doctor_token = reg_resp.json()["access_token"]

    # Submit a query as the doctor
    query_payload = {
        "subject": "Billing Issue",
        "message": "I cannot download my invoice."
    }
    qresp = client.post(
        "/api/v1/admin/queries",
        json=query_payload,
        headers={"Authorization": f"Bearer {doctor_token}"}
    )
    assert qresp.status_code == 201
    query_id = qresp.json()["id"]
    assert qresp.json()["status"] == "OPEN"

    # Admin resolves it
    db = TestingSessionLocal()
    admin_token, _ = make_master_admin_token(db)
    db.close()

    resolve_payload = {"response": "Your invoice has been emailed."}
    rresp = client.post(
        f"/api/v1/admin/queries/{query_id}/respond",
        json=resolve_payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert rresp.status_code == 200
    assert rresp.json()["status"] == "RESOLVED"
    assert rresp.json()["admin_response"] == "Your invoice has been emailed."
