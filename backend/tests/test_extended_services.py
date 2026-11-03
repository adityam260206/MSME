import pytest
from decimal import Decimal
from datetime import datetime, timezone
from backend.tests.conftest import get_auth_header
from backend.app.models.catalog import Category, Product
from backend.app.models.supplier import Supplier
from backend.app.models.customer import Customer
from backend.app.models.purchase import Purchase
from backend.app.models.employee import Employee
from backend.app.models.alert import Alert

def test_category_management_and_validation(client, seed_test_tenant, db_session):
    admin_headers = get_auth_header(seed_test_tenant["admin"])

    # 1. Create subcategory
    parent_cat = seed_test_tenant["category"]
    resp_sub = client.post(
        "/api/inventory/categories",
        headers=admin_headers,
        json={"name": "Power Tools", "description": "Electric power tools", "parent_id": parent_cat.id}
    )
    assert resp_sub.status_code == 200
    sub_id = resp_sub.json()["data"]["id"]

    # 2. Duplicate category name rejected
    resp_dup = client.post(
        "/api/inventory/categories",
        headers=admin_headers,
        json={"name": "Power Tools"}
    )
    assert resp_dup.status_code == 400
    assert resp_dup.json()["error_code"] == "DUPLICATE_CATEGORY"

    # 3. Update category
    resp_up = client.put(
        f"/api/inventory/categories/{sub_id}",
        headers=admin_headers,
        json={"name": "Heavy Power Tools", "description": "Updated"}
    )
    assert resp_up.status_code == 200
    assert resp_up.json()["data"]["name"] == "Heavy Power Tools"

    # 4. Self-parenting rejected
    resp_self = client.put(
        f"/api/inventory/categories/{sub_id}",
        headers=admin_headers,
        json={"parent_id": sub_id}
    )
    assert resp_self.status_code == 400
    assert resp_self.json()["error_code"] == "INVALID_PARENT"

    # 5. List categories
    resp_list = client.get("/api/inventory/categories", headers=admin_headers)
    assert resp_list.status_code == 200
    assert len(resp_list.json()["data"]) >= 2

def test_supplier_crud(client, seed_test_tenant):
    manager_headers = get_auth_header(seed_test_tenant["manager"])

    # Create supplier
    resp = client.post(
        "/api/business/suppliers",
        headers=manager_headers,
        json={
            "name": "Global Supplies Co",
            "contact_name": "John Doe",
            "email": "john@example.com",
            "phone": "+91 99887 76655",
            "address": "Warehouse 12, Industrial Hub",
        }
    )
    assert resp.status_code == 200
    sup_id = resp.json()["data"]["id"]

    # List suppliers with search
    resp_list = client.get("/api/business/suppliers?search=Global", headers=manager_headers)
    assert resp_list.status_code == 200
    assert len(resp_list.json()["data"]) == 1

    # Update supplier
    resp_up = client.put(
        f"/api/business/suppliers/{sup_id}",
        headers=manager_headers,
        json={"contact_name": "Jane Doe"}
    )
    assert resp_up.status_code == 200
    assert resp_up.json()["data"]["contact_name"] == "Jane Doe"

def test_customer_crud_and_history(client, seed_test_tenant):
    manager_headers = get_auth_header(seed_test_tenant["manager"])
    cust = seed_test_tenant["customer"]

    # Update customer
    resp_up = client.put(
        f"/api/business/customers/{cust.id}",
        headers=manager_headers,
        json={"phone": "+91 91122 33445"}
    )
    assert resp_up.status_code == 200
    assert resp_up.json()["data"]["phone"] == "+91 91122 33445"

    # Get customer detail with recent purchases
    resp_det = client.get(f"/api/business/customers/{cust.id}", headers=manager_headers)
    assert resp_det.status_code == 200
    assert "customer" in resp_det.json()["data"]
    assert "recent_purchases" in resp_det.json()["data"]

def test_purchase_cancellation_and_rbac(client, seed_test_tenant, db_session):
    admin_headers = get_auth_header(seed_test_tenant["admin"])
    manager_headers = get_auth_header(seed_test_tenant["manager"])
    prod = seed_test_tenant["product"]
    sup = seed_test_tenant["supplier"]

    init_stock = prod.stock_quantity

    # Create purchase
    resp = client.post(
        "/api/business/purchases",
        headers=manager_headers,
        json={
            "supplier_id": sup.id,
            "items": [{"product_id": prod.id, "quantity": 10, "unit_cost": "100.00"}],
            "tax_rate": "0.00",
            "discount_amount": "0.00",
        }
    )
    assert resp.status_code == 200
    purch_id = resp.json()["data"]["id"]

    db_session.refresh(prod)
    assert prod.stock_quantity == init_stock + 10

    # MANAGER cannot cancel purchase (only ADMIN and OWNER)
    resp_mgr_cancel = client.post(f"/api/business/purchases/{purch_id}/cancel", headers=manager_headers)
    assert resp_mgr_cancel.status_code == 403

    # ADMIN cancels purchase
    resp_admin_cancel = client.post(f"/api/business/purchases/{purch_id}/cancel", headers=admin_headers)
    assert resp_admin_cancel.status_code == 200
    assert resp_admin_cancel.json()["data"]["status"] == "CANCELLED"

    # Stock reversed back
    db_session.refresh(prod)
    assert prod.stock_quantity == init_stock

    # Repeated cancellation rejected with 400 ALREADY_CANCELLED
    resp_repeat = client.post(f"/api/business/purchases/{purch_id}/cancel", headers=admin_headers)
    assert resp_repeat.status_code == 400
    assert resp_repeat.json()["error_code"] == "ALREADY_CANCELLED"

def test_inventory_manual_adjust_and_movements_filter(client, seed_test_tenant, db_session):
    manager_headers = get_auth_header(seed_test_tenant["manager"])
    staff_headers = get_auth_header(seed_test_tenant["staff"])
    prod = seed_test_tenant["product"]

    # STAFF denied manual adjustment
    resp_staff = client.post(
        f"/api/inventory/products/{prod.id}/adjust-stock",
        headers=staff_headers,
        json={"quantity_delta": 5, "movement_type": "ADJUSTMENT", "reason": "Restock"}
    )
    assert resp_staff.status_code == 403

    # MANAGER performs valid adjustment
    init_stock = prod.stock_quantity
    resp_adj = client.post(
        f"/api/inventory/products/{prod.id}/adjust-stock",
        headers=manager_headers,
        json={"quantity_delta": 5, "movement_type": "ADJUSTMENT", "reason": "Found stock"}
    )
    assert resp_adj.status_code == 200
    db_session.refresh(prod)
    assert prod.stock_quantity == init_stock + 5

    # Negative adjustment exceeding available stock rejected
    resp_neg = client.post(
        f"/api/inventory/products/{prod.id}/adjust-stock",
        headers=manager_headers,
        json={"quantity_delta": -1000, "movement_type": "ADJUSTMENT", "reason": "Damage"}
    )
    assert resp_neg.status_code == 400
    assert resp_neg.json()["error_code"] == "INSUFFICIENT_STOCK"

    # List movements with filters
    resp_mov = client.get(
        f"/api/inventory/movements?product_id={prod.id}&movement_type=ADJUSTMENT",
        headers=manager_headers
    )
    assert resp_mov.status_code == 200
    assert len(resp_mov.json()["data"]) >= 1

def test_alert_mark_read(client, seed_test_tenant, db_session):
    admin_headers = get_auth_header(seed_test_tenant["admin"])
    prod = seed_test_tenant["product"]

    alert = Alert(
        tenant_id=seed_test_tenant["tenant"].id,
        product_id=prod.id,
        alert_type="LOW_STOCK",
        severity="WARNING",
        title="Warning Alert",
        message="Stock is low",
        is_read=False,
    )
    db_session.add(alert)
    db_session.commit()
    db_session.refresh(alert)

    # Mark as read
    resp = client.post(f"/api/alerts/{alert.id}/read", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["is_read"] is True

def test_employee_deactivate(client, seed_test_tenant, db_session):
    admin_headers = get_auth_header(seed_test_tenant["admin"])

    emp = Employee(
        tenant_id=seed_test_tenant["tenant"].id,
        name="Deactivate Emp",
        email="deact@example.com",
        role="Clerk",
        department="Operations",
        monthly_base_salary=Decimal("20000.00"),
        is_active=True,
    )
    db_session.add(emp)
    db_session.commit()
    db_session.refresh(emp)

    resp = client.post(f"/api/business/employees/{emp.id}/deactivate", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["is_active"] is False

def test_product_lifecycle_and_archive(client, seed_test_tenant):
    admin_headers = get_auth_header(seed_test_tenant["admin"])
    cat = seed_test_tenant["category"]

    # 1. Create product
    resp = client.post(
        "/api/inventory/products",
        headers=admin_headers,
        json={
            "name": "Barcode Scanner Pro",
            "sku": "SCAN-PRO-001",
            "category_id": cat.id,
            "cost_price": "1200.00",
            "selling_price": "1999.00",
            "stock_quantity": 25,
            "min_stock_level": 5,
            "lead_time_days": 4,
            "safety_stock": 8,
        }
    )
    assert resp.status_code == 200
    prod_data = resp.json()["data"]
    prod_id = prod_data["id"]
    assert prod_data["name"] == "Barcode Scanner Pro"
    assert prod_data["stock_status"] == "IN_STOCK"
    assert prod_data["category_name"] == cat.name

    # 2. Filter by stock_status
    resp_filter = client.get("/api/inventory/products?stock_status=IN_STOCK", headers=admin_headers)
    assert resp_filter.status_code == 200
    assert any(p["id"] == prod_id for p in resp_filter.json()["data"])

    # 3. Update product
    resp_edit = client.put(
        f"/api/inventory/products/{prod_id}",
        headers=admin_headers,
        json={"selling_price": "2199.00"}
    )
    assert resp_edit.status_code == 200
    assert float(resp_edit.json()["data"]["selling_price"]) == 2199.00

    # 4. Soft-delete / Archive product
    resp_del = client.delete(f"/api/inventory/products/{prod_id}", headers=admin_headers)
    assert resp_del.status_code == 200
    assert resp_del.json()["success"] is True

    # 5. Archived product should not appear in active products list
    resp_list = client.get("/api/inventory/products", headers=admin_headers)
    assert resp_list.status_code == 200
    assert all(p["id"] != prod_id for p in resp_list.json()["data"])

def test_category_empty_parent_and_supplier_empty_email(client, seed_test_tenant):
    admin_headers = get_auth_header(seed_test_tenant["admin"])

    # Empty parent_id should be treated as None without FK error
    resp_cat = client.post(
        "/api/inventory/categories",
        headers=admin_headers,
        json={"name": "Sanitized Root Category", "parent_id": ""}
    )
    assert resp_cat.status_code == 200
    assert resp_cat.json()["data"]["parent_id"] is None

    # Empty string email should be treated as None without validation error
    resp_sup = client.post(
        "/api/business/suppliers",
        headers=admin_headers,
        json={"name": "No Email Vendor", "email": "", "phone": "1234567890"}
    )
    assert resp_sup.status_code == 200
    assert resp_sup.json()["data"]["email"] is None
