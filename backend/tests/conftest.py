import os
import sys
import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.core.config import settings
from backend.app.core.security import hash_password, create_access_token
from backend.app.db.base import Base
from backend.app.db.session import get_db
from backend.app.main import app
from backend.app.models import (
    Tenant, Role, User, Category, Product, Supplier, Customer
)

# Test Database Engine (in-memory SQLite with StaticPool)
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture
def db_session():
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()

    # Seed roles
    for r_name in ["ADMIN", "OWNER", "MANAGER", "STAFF"]:
        session.add(Role(name=r_name, description=f"{r_name} role"))
    session.commit()

    yield session

    session.close()
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def seed_test_tenant(db_session):
    tenant = Tenant(
        id="test-tenant-1",
        name="Test Business MSME",
        currency="INR",
        is_active=True,
    )
    db_session.add(tenant)

    # Seed users
    admin = User(
        id="user-admin-1",
        tenant_id=tenant.id,
        username="testadmin",
        email="admin@example.com",
        password_hash=hash_password("Admin@12345"),
        full_name="Admin Test",
        role="ADMIN",
        is_active=True,
    )
    owner = User(
        id="user-owner-1",
        tenant_id=tenant.id,
        username="testowner",
        email="owner@example.com",
        password_hash=hash_password("Owner@12345"),
        full_name="Owner Test",
        role="OWNER",
        is_active=True,
    )
    manager = User(
        id="user-manager-1",
        tenant_id=tenant.id,
        username="testmanager",
        email="manager@example.com",
        password_hash=hash_password("Manager@12345"),
        full_name="Manager Test",
        role="MANAGER",
        is_active=True,
    )
    staff = User(
        id="user-staff-1",
        tenant_id=tenant.id,
        username="teststaff",
        email="staff@example.com",
        password_hash=hash_password("Staff@12345"),
        full_name="Staff Test",
        role="STAFF",
        is_active=True,
    )
    db_session.add_all([admin, owner, manager, staff])

    # Seed category
    cat = Category(
        id="cat-test-1",
        tenant_id=tenant.id,
        name="Test Hardware",
        description="Hardware tools",
    )
    db_session.add(cat)

    # Seed product
    prod = Product(
        id="prod-test-1",
        tenant_id=tenant.id,
        category_id=cat.id,
        name="Test Product 1",
        sku="TEST-SKU-001",
        cost_price=Decimal("100.00"),
        selling_price=Decimal("150.00"),
        stock_quantity=40,
        min_stock_level=5,
        lead_time_days=7,
        safety_stock=10,
        is_active=True,
    )
    db_session.add(prod)

    # Seed supplier
    sup = Supplier(
        id="sup-test-1",
        tenant_id=tenant.id,
        name="Test Supplier 1",
        contact_name="Supplier Contact",
        email="sup@example.com",
    )
    db_session.add(sup)

    # Seed customer
    cust = Customer(
        id="cust-test-1",
        tenant_id=tenant.id,
        name="Test Customer 1",
        email="cust@example.com",
        total_spent=Decimal("0.00"),
    )
    db_session.add(cust)

    db_session.commit()

    return {
        "tenant": tenant,
        "admin": admin,
        "owner": owner,
        "manager": manager,
        "staff": staff,
        "category": cat,
        "product": prod,
        "supplier": sup,
        "customer": cust,
    }

def get_auth_header(user: User) -> dict:
    token = create_access_token(
        subject=user.id,
        role=user.role,
        tenant_id=user.tenant_id,
        extra_claims={"username": user.username, "full_name": user.full_name},
    )
    return {"Authorization": f"Bearer {token}"}
