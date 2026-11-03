import pytest
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from backend.app.core.security import hash_password, create_access_token
from backend.app.models import (
    Customer, Sale, SaleItem, Product, Category, FinancialTransaction
)

def test_enterprise_credit_risk_evaluation_and_rbac(client, seed_test_tenant, db_session):
    tenant = seed_test_tenant["tenant"]
    admin = seed_test_tenant["admin"]
    staff = seed_test_tenant["staff"]
    admin_token = create_access_token(admin.id, admin.role, tenant.id)
    staff_token = create_access_token(staff.id, staff.role, tenant.id)

    # 1. STAFF is blocked by RBAC
    res_staff = client.post(
        "/api/finance/credit-risk/evaluate",
        headers={"Authorization": f"Bearer {staff_token}"}
    )
    assert res_staff.status_code == 403

    # 2. ADMIN can evaluate even with empty/initial transactions (graceful handling of missing data)
    res_admin = client.post(
        "/api/finance/credit-risk/evaluate",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_admin.status_code == 200
    data = res_admin.json()["data"]
    assert "score" in data
    assert 0 <= float(data["score"]) <= 100
    assert data["risk_tier"] in ["LOW_RISK", "MODERATE_RISK", "ELEVATED_RISK", "HIGH_RISK"]
    assert data["grade"] in ["A", "B", "C", "D"]
    assert "disclaimer" in data
    assert "NOT constitute a statutory CIBIL" in data["disclaimer"]
    assert len(data["recommendations"]) > 0

    # 3. Get latest evaluation
    res_latest = client.get(
        "/api/finance/credit-risk/latest",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_latest.status_code == 200
    assert res_latest.json()["data"]["id"] == data["id"]

    # 4. Get score history
    res_history = client.get(
        "/api/finance/credit-risk/history",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_history.status_code == 200
    assert len(res_history.json()["data"]) >= 1

def test_government_and_banking_scheme_eligibility(client, seed_test_tenant):
    tenant = seed_test_tenant["tenant"]
    owner = seed_test_tenant["owner"]
    owner_token = create_access_token(owner.id, owner.role, tenant.id)

    # 1. List official schemes catalog
    res_list = client.get(
        "/api/schemes",
        headers={"Authorization": f"Bearer {owner_token}"}
    )
    assert res_list.status_code == 200
    schemes = res_list.json()["data"]
    assert len(schemes) >= 5
    codes = [s["scheme_code"] for s in schemes]
    assert "CGTMSE" in codes
    assert "PMMY_MUDRA" in codes
    assert "STAND_UP_INDIA" in codes

    # 2. Evaluate eligibility for a standard Micro enterprise
    eval_payload = {
        "enterprise_category": "MICRO",
        "annual_turnover": 2500000.0,
        "vintage_years": 3,
        "desired_loan_amount": 1500000.0,  # 15 Lakhs
        "ownership_category": "GENERAL",
        "gst_registered": True,
        "industry_sector": "MANUFACTURING",
        "is_greenfield": False,
    }
    res_eval = client.post(
        "/api/schemes/evaluate",
        json=eval_payload,
        headers={"Authorization": f"Bearer {owner_token}"}
    )
    assert res_eval.status_code == 200
    data = res_eval.json()["data"]
    assert "results" in data
    assert data["eligible_count"] > 0
    assert "legal_disclaimer" in data

    # Check CGTMSE result
    cgtmse_res = next(r for r in data["results"] if r["scheme_code"] == "CGTMSE")
    assert cgtmse_res["status"] == "POTENTIALLY_ELIGIBLE"
    assert cgtmse_res["met_conditions_count"] == cgtmse_res["total_conditions_count"]
    assert len(cgtmse_res["checklist"]) >= 3

    # Check Stand-Up India (ineligible because not greenfield & general ownership)
    standup_res = next(r for r in data["results"] if r["scheme_code"] == "STAND_UP_INDIA")
    assert standup_res["status"] == "INELIGIBLE"
    assert len(standup_res["unmet_conditions"]) > 0

def test_customer_rating_system_and_reliability(client, seed_test_tenant, db_session):
    tenant = seed_test_tenant["tenant"]
    admin = seed_test_tenant["admin"]
    admin_token = create_access_token(admin.id, admin.role, tenant.id)

    # Create customer
    customer = Customer(
        tenant_id=tenant.id,
        name="Rajesh Sharma",
        email="rajesh@example.com",
        phone="9876543210",
        total_spent=Decimal("25000.00"),
        is_active=True,
    )
    db_session.add(customer)
    db_session.commit()

    # Create a completed sale for this customer
    sale = Sale(
        tenant_id=tenant.id,
        customer_id=customer.id,
        customer_name=customer.name,
        invoice_number="INV-2026-TEST-001",
        status="COMPLETED",
        subtotal=Decimal("5000.00"),
        tax_rate=Decimal("18.00"),
        tax_amount=Decimal("900.00"),
        discount_amount=Decimal("0.00"),
        total_amount=Decimal("5900.00"),
        payment_method="UPI",
        payment_status="PAID",
        actor_id=admin.id,
    )
    db_session.add(sale)
    db_session.commit()

    # 1. Submit review
    feedback_payload = {
        "sale_id": sale.id,
        "rating": 5,
        "comment": "Exceptional service and quick delivery!",
    }
    res_fb = client.post(
        f"/api/customers/{customer.id}/feedback",
        json=feedback_payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_fb.status_code == 201
    fb_data = res_fb.json()["data"]
    assert fb_data["rating"] == 5
    assert fb_data["customer_id"] == customer.id

    # 2. Prevent duplicate reviews for the same transaction
    res_dup = client.post(
        f"/api/customers/{customer.id}/feedback",
        json=feedback_payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_dup.status_code == 400
    assert res_dup.json()["error_code"] == "DUPLICATE_REVIEW"

    # 3. Get feedback summary
    res_sum = client.get(
        f"/api/customers/{customer.id}/feedback",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_sum.status_code == 200
    sum_data = res_sum.json()["data"]
    assert sum_data["total_reviews"] == 1
    assert float(sum_data["average_rating"]) == 5.0
    assert sum_data["rating_distribution"]["5_star"] == 1

    # 4. Objective Customer Reliability Indicator
    res_rel = client.get(
        f"/api/customers/{customer.id}/reliability",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_rel.status_code == 200
    rel_data = res_rel.json()["data"]
    assert "reliability_score" in rel_data
    assert "reliability_tier" in rel_data
    assert rel_data["total_orders_count"] == 1
    assert len(rel_data["contributing_factors"]) > 0

def test_long_term_invoice_retrieval_and_audit(client, seed_test_tenant, db_session):
    tenant = seed_test_tenant["tenant"]
    admin = seed_test_tenant["admin"]
    admin_token = create_access_token(admin.id, admin.role, tenant.id)

    # Create category & product
    cat = Category(tenant_id=tenant.id, name="Test Cat")
    db_session.add(cat)
    db_session.commit()

    prod = Product(
        tenant_id=tenant.id,
        category_id=cat.id,
        name="Historic Widget X",
        sku="SKU-HISTORIC-01",
        cost_price=Decimal("100.00"),
        selling_price=Decimal("200.00"),
        stock_quantity=50,
        min_stock_level=5,
        is_active=True,
    )
    db_session.add(prod)
    db_session.commit()

    initial_stock = prod.stock_quantity

    # Create a historical sale
    sale = Sale(
        tenant_id=tenant.id,
        customer_name="Historic Client Corp",
        invoice_number="INV-HISTORIC-9999",
        status="COMPLETED",
        subtotal=Decimal("400.00"),
        tax_rate=Decimal("18.00"),
        tax_amount=Decimal("72.00"),
        discount_amount=Decimal("20.00"),
        total_amount=Decimal("452.00"),
        payment_method="BANK_TRANSFER",
        payment_status="PAID",
        actor_id=admin.id,
    )
    db_session.add(sale)
    db_session.commit()

    item = SaleItem(
        sale_id=sale.id,
        product_id=prod.id,
        product_name=prod.name,
        sku=prod.sku,
        quantity=2,
        unit_price=Decimal("200.00"),
        line_total=Decimal("400.00"),
    )
    db_session.add(item)
    db_session.commit()

    # 1. Search historical invoices
    res_search = client.get(
        "/api/business/sales/historical/search?query=HISTORIC",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_search.status_code == 200
    search_data = res_search.json()["data"]
    assert len(search_data) >= 1
    assert search_data[0]["invoice_number"] == "INV-HISTORIC-9999"

    # 2. Recover historical document
    res_recover = client.get(
        f"/api/business/sales/{sale.id}/recover",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_recover.status_code == 200
    rec_data = res_recover.json()["data"]
    assert rec_data["is_recovered_document"] is True
    assert rec_data["original_invoice_number"] == "INV-HISTORIC-9999"
    assert rec_data["sale"]["subtotal"] == "400.00"
    assert rec_data["sale"]["tax_amount"] == "72.00"
    assert rec_data["sale"]["discount_amount"] == "20.00"
    assert rec_data["sale"]["total_amount"] == "452.00"

    # 3. FINANCIAL INTEGRITY GUARANTEES:
    # Inventory MUST NOT be altered by document recovery
    db_session.refresh(prod)
    assert prod.stock_quantity == initial_stock, "Document recovery must not alter product inventory!"

    # 4. Check audit trail
    res_trail = client.get(
        f"/api/business/sales/{sale.id}/audit-trail",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_trail.status_code == 200
    trail_data = res_trail.json()["data"]
    assert len(trail_data) >= 1
    assert trail_data[0]["action"] == "HISTORICAL_INVOICE_RECOVERY"

def test_customer_portal_and_strict_data_isolation(client, seed_test_tenant, db_session):
    tenant = seed_test_tenant["tenant"]
    admin = seed_test_tenant["admin"]

    # 1. Customer Registration
    reg_payload = {
        "name": "Customer Alice",
        "email": "alice@customer.com",
        "phone": "9123456789",
        "password": "Password@123",
        "tenant_id": tenant.id,
    }
    res_reg = client.post("/api/customer-portal/register", json=reg_payload)
    assert res_reg.status_code == 201
    alice_token = res_reg.json()["data"]["access_token"]
    alice_id = res_reg.json()["data"]["customer"]["id"]

    # 2. Register Customer Bob
    res_reg_bob = client.post(
        "/api/customer-portal/register",
        json={
            "name": "Customer Bob",
            "email": "bob@customer.com",
            "phone": "9988776655",
            "password": "Password@123",
            "tenant_id": tenant.id,
        }
    )
    assert res_reg_bob.status_code == 201
    bob_token = res_reg_bob.json()["data"]["access_token"]
    bob_id = res_reg_bob.json()["data"]["customer"]["id"]

    # 3. Customer Login test
    res_login = client.post(
        "/api/customer-portal/login",
        json={"email": "alice@customer.com", "password": "Password@123"}
    )
    assert res_login.status_code == 200
    assert "access_token" in res_login.json()["data"]

    # 4. Profile retrieval
    res_me = client.get(
        "/api/customer-portal/me",
        headers={"Authorization": f"Bearer {alice_token}"}
    )
    assert res_me.status_code == 200
    assert res_me.json()["data"]["name"] == "Customer Alice"

    # 5. Create a sale for Alice and a sale for Bob
    sale_alice = Sale(
        tenant_id=tenant.id,
        customer_id=alice_id,
        customer_name="Customer Alice",
        invoice_number="INV-ALICE-001",
        status="COMPLETED",
        subtotal=Decimal("1000.00"),
        tax_rate=Decimal("18.00"),
        tax_amount=Decimal("180.00"),
        discount_amount=Decimal("0.00"),
        total_amount=Decimal("1180.00"),
        payment_method="CASH",
        payment_status="PAID",
        actor_id=admin.id,
    )
    sale_bob = Sale(
        tenant_id=tenant.id,
        customer_id=bob_id,
        customer_name="Customer Bob",
        invoice_number="INV-BOB-001",
        status="COMPLETED",
        subtotal=Decimal("2000.00"),
        tax_rate=Decimal("18.00"),
        tax_amount=Decimal("360.00"),
        discount_amount=Decimal("0.00"),
        total_amount=Decimal("2360.00"),
        payment_method="UPI",
        payment_status="PAID",
        actor_id=admin.id,
    )
    db_session.add_all([sale_alice, sale_bob])
    db_session.commit()

    # 6. Alice fetches her orders -> should ONLY see Alice's orders
    res_alice_orders = client.get(
        "/api/customer-portal/orders",
        headers={"Authorization": f"Bearer {alice_token}"}
    )
    assert res_alice_orders.status_code == 200
    alice_orders = res_alice_orders.json()["data"]
    assert len(alice_orders) == 1
    assert alice_orders[0]["invoice_number"] == "INV-ALICE-001"

    # 7. STRICT DATA ISOLATION / ANTI-IDOR TEST:
    # Alice attempts to fetch Bob's invoice by ID -> MUST BE REJECTED with 404
    res_idor = client.get(
        f"/api/customer-portal/orders/{sale_bob.id}",
        headers={"Authorization": f"Bearer {alice_token}"}
    )
    assert res_idor.status_code == 404, "Customer must not access another customer's invoice!"

    # 8. Customer attempts to access administrative endpoints -> MUST BE BLOCKED with 403 Forbidden
    res_admin_block = client.get(
        "/api/finance/summary",
        headers={"Authorization": f"Bearer {alice_token}"}
    )
    assert res_admin_block.status_code in [401, 403], "Customer token must not access administrative finance!"

    # 9. Customer submits feedback on her order
    res_order_fb = client.post(
        f"/api/customer-portal/orders/{sale_alice.id}/feedback",
        json={"rating": 5, "comment": "Loved the product quality!"},
        headers={"Authorization": f"Bearer {alice_token}"}
    )
    assert res_order_fb.status_code == 201
    assert res_order_fb.json()["data"]["rating"] == 5
