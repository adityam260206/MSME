import pytest
from decimal import Decimal
from backend.tests.conftest import get_auth_header
from backend.app.models.catalog import Product
from backend.app.models.purchase import Purchase
from backend.app.models.sale import Sale
from backend.app.models.customer import Customer
from backend.app.models.inventory import StockMovement
from backend.app.models.finance import FinancialTransaction

def test_ac_008_purchase_restock(client, seed_test_tenant, db_session):
    """AC-008: Completed purchase of 20 units when stock is 10 results in stock 30, PURCHASE movement, and one linked EXPENSE entry."""
    manager_headers = get_auth_header(seed_test_tenant["manager"])
    prod = seed_test_tenant["product"]
    sup = seed_test_tenant["supplier"]

    prod.stock_quantity = 10
    db_session.commit()

    payload = {
        "supplier_id": sup.id,
        "items": [
            {"product_id": prod.id, "quantity": 20, "unit_cost": "100.00"}
        ],
        "tax_rate": "5.00",
        "discount_amount": "0.00",
        "payment_method": "CASH",
    }
    resp = client.post("/api/business/purchases", headers=manager_headers, json=payload)
    assert resp.status_code == 200
    purch_data = resp.json()["data"]

    # Verify stock is now 30
    db_session.refresh(prod)
    assert prod.stock_quantity == 30

    # Verify PURCHASE movement
    movement = db_session.query(StockMovement).filter(
        StockMovement.product_id == prod.id,
        StockMovement.movement_type == "PURCHASE",
        StockMovement.reference_id == purch_data["id"]
    ).first()
    assert movement is not None
    assert movement.quantity == 20
    assert movement.previous_stock == 10
    assert movement.new_stock == 30

    # Verify linked EXPENSE financial entry
    expense = db_session.query(FinancialTransaction).filter(
        FinancialTransaction.reference_id == purch_data["id"],
        FinancialTransaction.type == "EXPENSE",
        FinancialTransaction.category == "PURCHASES"
    ).first()
    assert expense is not None
    assert expense.amount == Decimal("2100.00")  # (20 * 100) + 5% tax = 2100.00

def test_ac_009_customer_spend_tracking(client, seed_test_tenant, db_session):
    """AC-009: Completing a sale of 150.00 for Customer-1 increments total_spent by exactly 150.00; guest sale does not update customer."""
    staff_headers = get_auth_header(seed_test_tenant["staff"])
    prod = seed_test_tenant["product"]  # selling_price = 150.00
    cust = seed_test_tenant["customer"]
    assert cust.total_spent == Decimal("0.00")

    # 1. Registered Customer Sale
    payload_cust = {
        "customer_id": cust.id,
        "items": [{"product_id": prod.id, "quantity": 1}],  # 1 * 150.00
        "tax_rate": "0.00",
        "discount_amount": "0.00",
    }
    resp = client.post("/api/business/sales", headers=staff_headers, json=payload_cust)
    assert resp.status_code == 200
    db_session.refresh(cust)
    assert cust.total_spent == Decimal("150.00")

    # 2. Guest Sale
    payload_guest = {
        "customer_name": "Walk-in Guest",
        "items": [{"product_id": prod.id, "quantity": 1}],
        "tax_rate": "0.00",
        "discount_amount": "0.00",
    }
    resp_guest = client.post("/api/business/sales", headers=staff_headers, json=payload_guest)
    assert resp_guest.status_code == 200
    # Customer total_spent should remain 150.00
    db_session.refresh(cust)
    assert cust.total_spent == Decimal("150.00")

def test_ac_010_sale_reversal_and_idempotence(client, seed_test_tenant, db_session):
    """AC-010: Cancelling completed sale restores stock via RETURN movements, reduces spend once; repeated cancellation fails."""
    staff_headers = get_auth_header(seed_test_tenant["staff"])
    manager_headers = get_auth_header(seed_test_tenant["manager"])
    prod = seed_test_tenant["product"]
    cust = seed_test_tenant["customer"]

    init_stock = prod.stock_quantity
    init_spent = cust.total_spent

    # Create a sale
    sale_resp = client.post(
        "/api/business/sales",
        headers=staff_headers,
        json={
            "customer_id": cust.id,
            "items": [{"product_id": prod.id, "quantity": 4}],
            "tax_rate": "0.00",
            "discount_amount": "0.00",
        },
    )
    assert sale_resp.status_code == 200
    sale_id = sale_resp.json()["data"]["id"]

    db_session.refresh(prod)
    db_session.refresh(cust)
    assert prod.stock_quantity == init_stock - 4
    assert cust.total_spent == init_spent + Decimal("600.00")

    # Cancel sale as MANAGER
    cancel_resp = client.post(f"/api/business/sales/{sale_id}/cancel", headers=manager_headers)
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["data"]["status"] == "CANCELLED"

    # Verify stock restored to init_stock
    db_session.refresh(prod)
    assert prod.stock_quantity == init_stock

    # Verify RETURN movement recorded
    ret_mov = db_session.query(StockMovement).filter(
        StockMovement.product_id == prod.id,
        StockMovement.movement_type == "RETURN",
        StockMovement.reference_id == sale_id
    ).first()
    assert ret_mov is not None
    assert ret_mov.quantity == 4

    # Verify customer spend reduced back
    db_session.refresh(cust)
    assert cust.total_spent == init_spent

    # Verify repeated cancellation returns 400 ALREADY_CANCELLED
    repeat_resp = client.post(f"/api/business/sales/{sale_id}/cancel", headers=manager_headers)
    assert repeat_resp.status_code == 400
    assert repeat_resp.json()["error_code"] == "ALREADY_CANCELLED"

    # Ensure no double stock addition occurred
    db_session.refresh(prod)
    assert prod.stock_quantity == init_stock

def test_ac_011_finance_calculations_precision(client, seed_test_tenant, db_session):
    """AC-011: Gross profit, net profit and margin match independent decimal calculations within 0.01 precision and avoid double counting."""
    owner_headers = get_auth_header(seed_test_tenant["owner"])
    staff_headers = get_auth_header(seed_test_tenant["staff"])
    manager_headers = get_auth_header(seed_test_tenant["manager"])
    prod = seed_test_tenant["product"]
    sup = seed_test_tenant["supplier"]

    # 1. Purchase: 5 units @ 100.00 = 500.00 subtotal, 0% tax = 500.00 expense
    client.post(
        "/api/business/purchases",
        headers=manager_headers,
        json={
            "supplier_id": sup.id,
            "items": [{"product_id": prod.id, "quantity": 5, "unit_cost": "100.00"}],
            "tax_rate": "0.00",
            "discount_amount": "0.00",
        },
    )

    # 2. Sale: 4 units @ 150.00 = 600.00 revenue
    client.post(
        "/api/business/sales",
        headers=staff_headers,
        json={
            "items": [{"product_id": prod.id, "quantity": 4, "unit_price": "150.00"}],
            "tax_rate": "0.00",
            "discount_amount": "0.00",
        },
    )

    # 3. Manual overhead: 100.00 Utilities expense
    client.post(
        "/api/finance/transactions",
        headers=owner_headers,
        json={
            "type": "EXPENSE",
            "category": "UTILITIES",
            "amount": "100.00",
            "description": "Electricity",
        },
    )

    # Fetch finance summary
    resp = client.get("/api/finance/summary", headers=owner_headers)
    assert resp.status_code == 200
    summary = resp.json()["data"]

    # Independent calculations:
    # Revenue = 600.00
    # Purchases Expense = 500.00
    # Total Expenses = 500.00 + 100.00 = 600.00
    # Gross Profit = Revenue - Purchases Expense = 600.00 - 500.00 = 100.00
    # Net Profit = Revenue - Total Expenses = 600.00 - 600.00 = 0.00
    # Margin = (0.00 / 600.00) * 100 = 0.00%
    assert Decimal(str(summary["total_revenue"])) == Decimal("600.00")
    assert Decimal(str(summary["purchases_expense"])) == Decimal("500.00")
    assert Decimal(str(summary["total_expenses"])) == Decimal("600.00")
    assert Decimal(str(summary["gross_profit"])) == Decimal("100.00")
    assert Decimal(str(summary["net_profit"])) == Decimal("0.00")
    assert Decimal(str(summary["profit_margin_percent"])) == Decimal("0.00")
