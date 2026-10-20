import pytest
from decimal import Decimal
from backend.tests.conftest import get_auth_header
from backend.app.models.catalog import Product
from backend.app.models.customer import Customer
from backend.app.models.inventory import StockMovement
from backend.app.models.sale import Sale
from backend.app.models.finance import FinancialTransaction
from backend.app.models.alert import Alert

def test_ac_003_sku_uniqueness(client, seed_test_tenant, db_session):
    """AC-003: Creating a product with an existing SKU returns 400 DUPLICATE_SKU and does not create a second product."""
    admin_headers = get_auth_header(seed_test_tenant["admin"])
    cat = seed_test_tenant["category"]

    # Initial count of products
    init_count = db_session.query(Product).count()

    # Attempt to create product with existing SKU "TEST-SKU-001"
    payload = {
        "name": "Duplicate SKU Product",
        "sku": "TEST-SKU-001",
        "category_id": cat.id,
        "cost_price": "50.00",
        "selling_price": "75.00",
        "stock_quantity": 10,
        "min_stock_level": 5,
        "lead_time_days": 7,
        "safety_stock": 5,
    }
    resp = client.post("/api/inventory/products", headers=admin_headers, json=payload)
    assert resp.status_code == 400
    err = resp.json()
    assert err["success"] is False
    assert err["error_code"] == "DUPLICATE_SKU"

    # Confirm no second product created
    assert db_session.query(Product).count() == init_count

def test_ac_004_positive_pricing_validation(client, seed_test_tenant):
    """AC-004: cost_price <= 0 or selling_price <= 0 returns 422."""
    admin_headers = get_auth_header(seed_test_tenant["admin"])
    cat = seed_test_tenant["category"]

    # Test cost_price <= 0
    resp_zero_cost = client.post(
        "/api/inventory/products",
        headers=admin_headers,
        json={
            "name": "Zero Cost Product",
            "sku": "SKU-ZERO-COST",
            "category_id": cat.id,
            "cost_price": "0.00",
            "selling_price": "100.00",
            "stock_quantity": 10,
            "min_stock_level": 5,
            "lead_time_days": 7,
            "safety_stock": 5,
        },
    )
    assert resp_zero_cost.status_code == 422
    assert resp_zero_cost.json()["error_code"] == "VALIDATION_ERROR"

    # Test selling_price <= 0
    resp_neg_selling = client.post(
        "/api/inventory/products",
        headers=admin_headers,
        json={
            "name": "Negative Selling Product",
            "sku": "SKU-NEG-SELL",
            "category_id": cat.id,
            "cost_price": "50.00",
            "selling_price": "-10.00",
            "stock_quantity": 10,
            "min_stock_level": 5,
            "lead_time_days": 7,
            "safety_stock": 5,
        },
    )
    assert resp_neg_selling.status_code == 422

def test_ac_005_stock_decrement_on_sale(client, seed_test_tenant, db_session):
    """AC-005: Sale of 3 units when stock is 40 results in stock 37 and exactly the required SALE movement."""
    staff_headers = get_auth_header(seed_test_tenant["staff"])
    prod = seed_test_tenant["product"]
    assert prod.stock_quantity == 40

    payload = {
        "items": [
            {"product_id": prod.id, "quantity": 3}
        ],
        "payment_method": "CASH",
        "tax_rate": "0.00",
        "discount_amount": "0.00",
    }
    resp = client.post("/api/business/sales", headers=staff_headers, json=payload)
    assert resp.status_code == 200
    sale_data = resp.json()["data"]

    # Verify persisted stock balance
    db_session.refresh(prod)
    assert prod.stock_quantity == 37

    # Verify SALE movement appended
    movement = db_session.query(StockMovement).filter(
        StockMovement.product_id == prod.id,
        StockMovement.movement_type == "SALE",
        StockMovement.reference_id == sale_data["id"]
    ).first()
    assert movement is not None
    assert movement.quantity == -3
    assert movement.previous_stock == 40
    assert movement.new_stock == 37

def test_ac_006_insufficient_stock_rejection(client, seed_test_tenant, db_session):
    """AC-006: Attempt to sell 10 when stock is 5 returns 400 INSUFFICIENT_STOCK and leaves state unchanged."""
    staff_headers = get_auth_header(seed_test_tenant["staff"])
    prod = seed_test_tenant["product"]
    cust = seed_test_tenant["customer"]
    prod_id = str(prod.id)
    cust_id = str(cust.id)

    # Set stock to 5
    prod.stock_quantity = 5
    db_session.commit()

    init_sales_count = db_session.query(Sale).count()
    init_ledger_count = db_session.query(FinancialTransaction).count()
    init_cust_spent = cust.total_spent

    payload = {
        "customer_id": cust_id,
        "items": [
            {"product_id": prod_id, "quantity": 10}
        ],
    }
    resp = client.post("/api/business/sales", headers=staff_headers, json=payload)
    assert resp.status_code == 400
    err = resp.json()
    assert err["success"] is False
    assert err["error_code"] == "INSUFFICIENT_STOCK"
    assert "Requested: 10, Available: 5" in err["message"]

    # Verify no stock, sales, customer or ledger change
    refreshed_prod = db_session.query(Product).filter(Product.id == prod_id).first()
    refreshed_cust = db_session.query(Customer).filter(Customer.id == cust_id).first()
    assert refreshed_prod.stock_quantity == 5
    assert db_session.query(Sale).count() == init_sales_count
    assert db_session.query(FinancialTransaction).count() == init_ledger_count
    assert refreshed_cust.total_spent == init_cust_spent

def test_ac_007_atomic_rollback_on_failure(client, seed_test_tenant, db_session, monkeypatch):
    """AC-007: Simulate a failure during sale finalization; all changes rollback."""
    staff_headers = get_auth_header(seed_test_tenant["staff"])
    prod = seed_test_tenant["product"]
    prod_id = str(prod.id)
    init_stock = prod.stock_quantity
    init_sales_count = db_session.query(Sale).count()
    init_ledger_count = db_session.query(FinancialTransaction).count()

    # Monkeypatch FinancialTransaction instantiation in sale_service to raise an error midway
    from backend.app.services import sale_service
    orig_ft = sale_service.FinancialTransaction

    def faulty_ft(*args, **kwargs):
        raise RuntimeError("Injected database failure during financial transaction posting!")

    monkeypatch.setattr(sale_service, "FinancialTransaction", faulty_ft)

    payload = {
        "items": [{"product_id": prod_id, "quantity": 2}],
    }
    with pytest.raises(RuntimeError):
        sale_service.create_sale(
            db_session,
            seed_test_tenant["tenant"].id,
            seed_test_tenant["staff"].id,
            sale_service.SaleCreate(**payload),
        )

    # Verify full atomic rollback
    refreshed_prod = db_session.query(Product).filter(Product.id == prod_id).first()
    assert refreshed_prod.stock_quantity == init_stock
    assert db_session.query(Sale).count() == init_sales_count
    assert db_session.query(FinancialTransaction).count() == init_ledger_count

def test_ac_012_stock_alerts_warning_and_critical(client, seed_test_tenant, db_session):
    """AC-012: Stock <= min_stock_level produces WARNING; stock <= 0 produces CRITICAL; no duplicate alerts."""
    staff_headers = get_auth_header(seed_test_tenant["staff"])
    prod = seed_test_tenant["product"]

    # Product min_stock_level is 5. Set stock to 3 (WARNING)
    prod.stock_quantity = 3
    db_session.commit()

    resp = client.get("/api/alerts", headers=staff_headers)
    assert resp.status_code == 200
    alerts = resp.json()["data"]
    warning_alert = next((a for a in alerts if a["product_id"] == prod.id and a["alert_type"] == "LOW_STOCK"), None)
    assert warning_alert is not None
    assert warning_alert["severity"] == "WARNING"

    # Repeated read does not duplicate alert
    resp2 = client.get("/api/alerts", headers=staff_headers)
    alerts2 = resp2.json()["data"]
    count_low = sum(1 for a in alerts2 if a["product_id"] == prod.id and a["alert_type"] == "LOW_STOCK" and not a["is_read"])
    assert count_low == 1

    # Now set stock to 0 (CRITICAL)
    prod.stock_quantity = 0
    db_session.commit()

    resp3 = client.get("/api/alerts", headers=staff_headers)
    alerts3 = resp3.json()["data"]
    critical_alert = next((a for a in alerts3 if a["product_id"] == prod.id and a["alert_type"] == "OUT_OF_STOCK"), None)
    assert critical_alert is not None
    assert critical_alert["severity"] == "CRITICAL"
