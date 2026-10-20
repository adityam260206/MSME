import csv
import io
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from backend.tests.conftest import get_auth_header
from backend.app.models.sale import Sale, SaleItem
from backend.app.models.employee import Employee

def test_ac_013_rop_formula_verification(client, seed_test_tenant, db_session):
    """AC-013: ROP matches (Avg Daily Usage * Lead Time) + Safety Stock on known 30-day sales fixtures."""
    manager_headers = get_auth_header(seed_test_tenant["manager"])
    prod = seed_test_tenant["product"]
    # Config: lead_time_days = 7, safety_stock = 10

    # Create known 30-day sales fixture: 60 units sold in the last 30 days
    # Avg Daily Usage = 60 / 30.0 = 2.00
    # Expected ROP = (2.00 * 7) + 10 = 14 + 10 = 24.00
    sale = Sale(
        tenant_id=seed_test_tenant["tenant"].id,
        invoice_number="INV-ROP-TEST",
        status="COMPLETED",
        subtotal=Decimal("9000.00"),
        total_amount=Decimal("9000.00"),
        actor_id=seed_test_tenant["staff"].id,
        created_at=datetime.now(timezone.utc) - timedelta(days=5),
    )
    db_session.add(sale)
    db_session.flush()

    s_item = SaleItem(
        sale_id=sale.id,
        product_id=prod.id,
        product_name=prod.name,
        sku=prod.sku,
        quantity=60,
        unit_price=Decimal("150.00"),
        line_total=Decimal("9000.00"),
    )
    db_session.add(s_item)
    db_session.commit()

    resp = client.get("/api/analytics/inventory", headers=manager_headers)
    assert resp.status_code == 200
    rop_items = resp.json()["data"]["rop_recommendations"]
    target_rop = next((r for r in rop_items if r["product_id"] == prod.id), None)
    assert target_rop is not None
    assert Decimal(str(target_rop["avg_daily_usage"])) == Decimal("2.00")
    assert target_rop["lead_time_days"] == 7
    assert target_rop["safety_stock"] == 10
    assert Decimal(str(target_rop["reorder_point"])) == Decimal("24.00")

def test_ac_014_sales_report_exports(client, seed_test_tenant, db_session):
    """AC-014: CSV and JSON downloads are valid, include all matching rows and totals, respect permissions (STAFF denied)."""
    admin_headers = get_auth_header(seed_test_tenant["admin"])
    staff_headers = get_auth_header(seed_test_tenant["staff"])
    prod = seed_test_tenant["product"]

    # 1. Staff is denied access to reports with HTTP 403
    resp_staff = client.post(
        "/api/reports/sales",
        headers=staff_headers,
        json={"start_date": "2026-01-01", "end_date": "2026-12-31", "format": "json"}
    )
    assert resp_staff.status_code == 403

    # 2. Complete a sale for report fixture
    client.post(
        "/api/business/sales",
        headers=get_auth_header(seed_test_tenant["manager"]),
        json={
            "customer_name": "Export, \"Quoted\" & Special Customer",
            "items": [{"product_id": prod.id, "quantity": 2}],
            "tax_rate": "10.00",
            "discount_amount": "0.00",
        },
    )

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # 3. Request JSON format
    resp_json = client.post(
        "/api/reports/sales",
        headers=admin_headers,
        json={"start_date": today, "end_date": today, "format": "json"}
    )
    assert resp_json.status_code == 200
    json_data = resp_json.json()["data"]
    assert len(json_data["items"]) >= 1
    assert json_data["summary"]["total_units_sold"] >= 2
    assert Decimal(str(json_data["summary"]["total_revenue"])) >= Decimal("300.00")

    # 4. Request CSV format
    resp_csv = client.post(
        "/api/reports/sales",
        headers=admin_headers,
        json={"start_date": today, "end_date": today, "format": "csv"}
    )
    assert resp_csv.status_code == 200
    assert "text/csv" in resp_csv.headers["content-type"]
    csv_text = resp_csv.text

    # Verify RFC 4180 parsing of CSV
    reader = csv.reader(io.StringIO(csv_text))
    rows = list(reader)
    assert len(rows) > 3
    assert rows[0][0] == "Invoice Number"
    # Ensure quoted customer name handled safely
    customer_names = [r[2] for r in rows if len(r) > 2]
    assert any("Export, \"Quoted\" & Special Customer" in name for name in customer_names)

def test_employee_hr_and_salary_masking(client, seed_test_tenant, db_session):
    """Test HR creation, role permissions, and salary masking for MANAGER."""
    admin_headers = get_auth_header(seed_test_tenant["admin"])
    manager_headers = get_auth_header(seed_test_tenant["manager"])
    staff_headers = get_auth_header(seed_test_tenant["staff"])

    # 1. STAFF gets 403 on employee endpoints
    resp_staff = client.get("/api/business/employees", headers=staff_headers)
    assert resp_staff.status_code == 403

    # 2. ADMIN creates employee with positive salary
    resp_create = client.post(
        "/api/business/employees",
        headers=admin_headers,
        json={
            "name": "Kavita Rao",
            "email": "kavita@example.com",
            "role": "Accountant",
            "department": "Finance",
            "monthly_base_salary": "35000.00",
        },
    )
    assert resp_create.status_code == 200
    emp_id = resp_create.json()["data"]["id"]

    # Salary <= 0 is rejected with 422
    resp_invalid_sal = client.post(
        "/api/business/employees",
        headers=admin_headers,
        json={
            "name": "Invalid Emp",
            "email": "invalid@example.com",
            "role": "Temp",
            "department": "Admin",
            "monthly_base_salary": "0.00",
        },
    )
    assert resp_invalid_sal.status_code == 422

    # 3. ADMIN reads employees - sees salary
    resp_admin_list = client.get("/api/business/employees", headers=admin_headers)
    admin_emp = next((e for e in resp_admin_list.json()["data"] if e["id"] == emp_id), None)
    assert admin_emp is not None
    assert Decimal(str(admin_emp["monthly_base_salary"])) == Decimal("35000.00")

    # 4. MANAGER reads employees - sees directory BUT salary is masked/None!
    resp_mgr_list = client.get("/api/business/employees", headers=manager_headers)
    assert resp_mgr_list.status_code == 200
    mgr_emp = next((e for e in resp_mgr_list.json()["data"] if e["id"] == emp_id), None)
    assert mgr_emp is not None
    assert mgr_emp["name"] == "Kavita Rao"
    assert mgr_emp["monthly_base_salary"] is None  # Masked!

def test_tenant_isolation_boundary(client, seed_test_tenant, db_session):
    """Test strict tenant isolation: resources belonging to Tenant-A are never leaked to Tenant-B."""
    admin_headers = get_auth_header(seed_test_tenant["admin"])
    prod_tenant_1 = seed_test_tenant["product"]

    # Create Tenant 2 and user for Tenant 2
    from backend.app.models.tenant import Tenant
    from backend.app.models.user import User
    from backend.app.core.security import hash_password

    t2 = Tenant(id="tenant-2-separate", name="Tenant 2 Corp", currency="INR", is_active=True)
    db_session.add(t2)
    u2 = User(
        id="user-t2-admin",
        tenant_id=t2.id,
        username="t2admin",
        email="t2admin@test.local",
        password_hash=hash_password("Pass@12345"),
        full_name="T2 Admin",
        role="ADMIN",
        is_active=True,
    )
    db_session.add(u2)
    db_session.commit()

    t2_headers = get_auth_header(u2)

    # Tenant 2 lists products: should NOT see Tenant 1's product
    resp_t2_prods = client.get("/api/inventory/products", headers=t2_headers)
    assert resp_t2_prods.status_code == 200
    assert len(resp_t2_prods.json()["data"]) == 0

    # Tenant 2 attempts to get Tenant 1's product by ID: 404 NOT FOUND
    resp_cross = client.get(f"/api/inventory/products/{prod_tenant_1.id}", headers=t2_headers)
    assert resp_cross.status_code == 404
