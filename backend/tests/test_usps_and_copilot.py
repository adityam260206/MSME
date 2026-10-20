from decimal import Decimal
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch
from backend.tests.conftest import get_auth_header
from backend.app.models.catalog import Product
from backend.app.models.sale import Sale, SaleItem
from backend.app.models.purchase import Purchase, PurchaseItem
from backend.app.models.supplier import Supplier
from backend.app.models.finance import FinancialTransaction
from backend.app.models.goal import BusinessGoal

def test_replenishment_planner(client, seed_test_tenant, db_session):
    manager_headers = get_auth_header(seed_test_tenant["manager"])
    resp = client.get("/api/analytics/replenishment-planner", headers=manager_headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "items" in data
    assert "total_reorder_items_count" in data
    assert "total_estimated_replenishment_cost" in data
    assert isinstance(data["items"], list)

def test_anomaly_detection_report(client, seed_test_tenant, db_session):
    manager_headers = get_auth_header(seed_test_tenant["manager"])
    resp = client.get("/api/analytics/anomalies", headers=manager_headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "anomalies" in data
    assert "high_severity_count" in data
    assert "medium_severity_count" in data

def test_product_profitability_rbac_and_calculation(client, seed_test_tenant, db_session):
    admin_headers = get_auth_header(seed_test_tenant["admin"])
    staff_headers = get_auth_header(seed_test_tenant["staff"])
    manager_headers = get_auth_header(seed_test_tenant["manager"])

    # Staff & Manager must be rejected with 403 Forbidden
    assert client.get("/api/analytics/profitability", headers=staff_headers).status_code == 403
    assert client.get("/api/analytics/profitability", headers=manager_headers).status_code == 403

    # Admin succeeds
    resp = client.get("/api/analytics/profitability", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "products" in data
    assert "total_sales_revenue" in data
    assert "overall_gross_profit" in data

def test_cash_flow_projection_rbac_and_schedule(client, seed_test_tenant, db_session):
    owner_headers = get_auth_header(seed_test_tenant["owner"])
    staff_headers = get_auth_header(seed_test_tenant["staff"])

    # Staff rejected with 403
    assert client.get("/api/analytics/cash-flow-projection", headers=staff_headers).status_code == 403

    # Owner succeeds
    resp = client.get("/api/analytics/cash-flow-projection", headers=owner_headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "current_cash_position" in data
    assert "projected_inflows_30d" in data
    assert "projected_outflows_30d" in data
    assert "schedule" in data
    assert "assumptions" in data

def test_action_center_feed(client, seed_test_tenant, db_session):
    manager_headers = get_auth_header(seed_test_tenant["manager"])
    resp = client.get("/api/analytics/action-center", headers=manager_headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "actions" in data
    assert "total_pending_actions" in data

def test_business_goals_crud_and_progress(client, seed_test_tenant, db_session):
    admin_headers = get_auth_header(seed_test_tenant["admin"])
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")

    # Set business goal
    create_payload = {
        "target_month": current_month,
        "target_revenue": "100000.00",
        "target_sales_volume": 50,
        "notes": "Q4 aggressive revenue target"
    }
    set_resp = client.post("/api/dashboard/goals", json=create_payload, headers=admin_headers)
    assert set_resp.status_code == 200
    assert set_resp.json()["data"]["target_month"] == current_month

    # Get goal progress
    prog_resp = client.get(f"/api/dashboard/goals?month={current_month}", headers=admin_headers)
    assert prog_resp.status_code == 200
    prog = prog_resp.json()["data"]
    assert prog["target_month"] == current_month
    assert Decimal(str(prog["target_revenue"])) == Decimal("100000.00")
    assert prog["target_sales_volume"] == 50

def test_ai_copilot_status(client, seed_test_tenant):
    headers = get_auth_header(seed_test_tenant["admin"])
    resp = client.get("/api/ai/status", headers=headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "configured" in data
    assert "model" in data
    assert data["provider"] == "Groq"

def test_ai_copilot_off_topic_refusal(client, seed_test_tenant):
    headers = get_auth_header(seed_test_tenant["admin"])
    payload = {"message": "Tell me a joke about weather in Paris"}
    resp = client.post("/api/ai/chat", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["intent"] == "OFF_TOPIC"
    assert "MSME360 Business Copilot" in data["reply"]

def test_ai_copilot_staff_sensitive_data_restriction(client, seed_test_tenant):
    staff_headers = get_auth_header(seed_test_tenant["staff"])
    payload = {"message": "What is our net profit and manager salary?"}
    resp = client.post("/api/ai/chat", json=payload, headers=staff_headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["intent"] == "UNAUTHORIZED"
    assert "ADMIN" in data["reply"]

def test_ai_copilot_grounded_business_data_query(client, seed_test_tenant):
    admin_headers = get_auth_header(seed_test_tenant["admin"])
    payload = {"message": "Which products need reordering right now?"}
    resp = client.post("/api/ai/chat", json=payload, headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data["reply"]) > 10
    assert len(data["references"]) > 0

def test_ai_copilot_mocked_groq_generation(client, seed_test_tenant):
    admin_headers = get_auth_header(seed_test_tenant["admin"])
    
    mock_choice = MagicMock()
    mock_choice.message.content = "Based on your verified inventory, SKU ELEC-001 has 15 units remaining."
    mock_completion = MagicMock()
    mock_completion.choices = [mock_choice]

    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_completion

    with patch("backend.app.core.config.settings.GROQ_API_KEY", "gsk_dummy_test_key_12345"):
        with patch("groq.Groq", return_value=mock_client):
            resp = client.post(
                "/api/ai/chat",
                json={"message": "Summarize product ELEC-001 stock"},
                headers=admin_headers
            )
            assert resp.status_code == 200
            data = resp.json()["data"]
            assert "ELEC-001" in data["reply"]
            assert "Groq" in data["execution_notes"]
