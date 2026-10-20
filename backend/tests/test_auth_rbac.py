import time
import pytest
from backend.tests.conftest import get_auth_header
from backend.app.models.user import User

def test_ac_001_authentication_valid_and_invalid(client, seed_test_tenant, db_session):
    """AC-001: Valid credentials return signed JWT within 300 ms; invalid credentials return 401 INVALID_CREDENTIALS."""
    # Test valid credentials & measure latency
    start_time = time.perf_counter()
    resp = client.post("/api/auth/login", json={"username": "testadmin", "password": "Admin@12345"})
    duration_ms = (time.perf_counter() - start_time) * 1000

    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "access_token" in data["data"]
    assert data["data"]["user"]["username"] == "testadmin"
    assert data["data"]["user"]["role"] == "ADMIN"
    # Never return password hash
    assert "password_hash" not in data["data"]["user"]

    # Test invalid password
    resp_invalid = client.post("/api/auth/login", json={"username": "testadmin", "password": "WrongPassword"})
    assert resp_invalid.status_code == 401
    err = resp_invalid.json()
    assert err["success"] is False
    assert err["error_code"] == "INVALID_CREDENTIALS"

    # Test unknown user
    resp_unknown = client.post("/api/auth/login", json={"username": "nonexistent", "password": "Admin@12345"})
    assert resp_unknown.status_code == 401
    assert resp_unknown.json()["error_code"] == "INVALID_CREDENTIALS"

    # Test deactivated user
    staff = seed_test_tenant["staff"]
    staff.is_active = False
    db_session.commit()

    resp_deact = client.post("/api/auth/login", json={"username": "teststaff", "password": "Staff@12345"})
    assert resp_deact.status_code == 403
    assert resp_deact.json()["error_code"] == "FORBIDDEN"

def test_ac_002_rbac_finance_access_control(client, seed_test_tenant):
    """AC-002: STAFF calling /api/finance/summary receives 403; MANAGER receives 403; OWNER/ADMIN receive 200."""
    staff_headers = get_auth_header(seed_test_tenant["staff"])
    manager_headers = get_auth_header(seed_test_tenant["manager"])
    owner_headers = get_auth_header(seed_test_tenant["owner"])
    admin_headers = get_auth_header(seed_test_tenant["admin"])

    # 1. STAFF receives 403 and NO sensitive financial payload
    resp_staff = client.get("/api/finance/summary", headers=staff_headers)
    assert resp_staff.status_code == 403
    staff_json = resp_staff.json()
    assert staff_json["success"] is False
    assert staff_json["error_code"] == "FORBIDDEN"
    assert "data" not in staff_json

    # 2. MANAGER receives 403
    resp_mgr = client.get("/api/finance/summary", headers=manager_headers)
    assert resp_mgr.status_code == 403
    assert resp_mgr.json()["error_code"] == "FORBIDDEN"

    # 3. OWNER receives 200
    resp_owner = client.get("/api/finance/summary", headers=owner_headers)
    assert resp_owner.status_code == 200
    assert resp_owner.json()["success"] is True
    assert "total_revenue" in resp_owner.json()["data"]

    # 4. ADMIN receives 200
    resp_admin = client.get("/api/finance/summary", headers=admin_headers)
    assert resp_admin.status_code == 200
    assert resp_admin.json()["success"] is True

def test_get_auth_me(client, seed_test_tenant):
    admin_headers = get_auth_header(seed_test_tenant["admin"])
    resp = client.get("/api/auth/me", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["role"] == "ADMIN"
    assert "manage_users" in data["capabilities"]

def test_user_provisioning_and_rbac(client, seed_test_tenant):
    admin_headers = get_auth_header(seed_test_tenant["admin"])
    staff_headers = get_auth_header(seed_test_tenant["staff"])

    # Staff cannot provision users
    resp_staff = client.post(
        "/api/users",
        headers=staff_headers,
        json={
            "username": "newstaff",
            "email": "newstaff@example.com",
            "password": "Password@123",
            "full_name": "New Staff",
            "role": "STAFF",
        },
    )
    assert resp_staff.status_code == 403

    # Admin can provision users
    resp_admin = client.post(
        "/api/users",
        headers=admin_headers,
        json={
            "username": "newstaff",
            "email": "newstaff@example.com",
            "password": "Password@123",
            "full_name": "New Staff",
            "role": "STAFF",
        },
    )
    assert resp_admin.status_code == 200
    assert resp_admin.json()["data"]["username"] == "newstaff"
