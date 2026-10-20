from typing import List, Optional, Dict, Any
from decimal import Decimal
from pydantic import BaseModel

class TopProductItem(BaseModel):
    product_id: str
    product_name: str
    sku: str
    stock_quantity: int
    units_sold: int
    revenue: Optional[Decimal] = None  # None for STAFF

class DailySalesTrend(BaseModel):
    date: str
    sales_count: int
    revenue: Optional[Decimal] = None  # None for STAFF

class DashboardSummaryResponse(BaseModel):
    role: str
    today_revenue: Optional[Decimal] = None
    monthly_revenue: Optional[Decimal] = None
    monthly_expenses: Optional[Decimal] = None
    monthly_sales_volume: int = 0
    gross_profit: Optional[Decimal] = None
    gross_profit_margin: Optional[Decimal] = None
    total_products: int = 0
    low_stock_count: int = 0
    out_of_stock_count: int = 0
    top_products: List[TopProductItem] = []

class SalesAnalyticsResponse(BaseModel):
    trends: List[DailySalesTrend]
    top_selling_by_quantity: List[TopProductItem]
    top_selling_by_revenue: Optional[List[TopProductItem]] = None  # None for STAFF

class ROPRecommendation(BaseModel):
    product_id: str
    product_name: str
    sku: str
    current_stock: int
    min_stock_level: int
    avg_daily_usage: Decimal
    lead_time_days: int
    safety_stock: int
    reorder_point: Decimal
    recommended_order_quantity: int
    status: str

class VelocityItem(BaseModel):
    product_id: str
    product_name: str
    sku: str
    units_sold_30d: int
    velocity_category: str  # Fast-Moving, Medium-Moving, Slow-Moving

class InventoryAnalyticsResponse(BaseModel):
    total_products: int
    low_stock_count: int
    out_of_stock_count: int
    category_distribution: Dict[str, int]
    rop_recommendations: List[ROPRecommendation] = []
    velocity_classification: List[VelocityItem] = []

class ReplenishmentPlanItem(BaseModel):
    product_id: str
    product_name: str
    sku: str
    category_name: str
    current_stock: int
    avg_daily_usage: Decimal
    lead_time_days: int
    safety_stock: int
    reorder_point: Decimal
    recommended_order_quantity: int
    unit_cost_price: Decimal
    estimated_total_cost: Decimal
    preferred_supplier_id: Optional[str] = None
    preferred_supplier_name: Optional[str] = None
    urgency: str  # CRITICAL, HIGH, MODERATE, OPTIMAL
    explanation: str

class ReplenishmentPlanResponse(BaseModel):
    items: List[ReplenishmentPlanItem]
    total_reorder_items_count: int
    total_estimated_replenishment_cost: Decimal

class AnomalyItem(BaseModel):
    id: str
    condition: str
    severity: str  # HIGH, MEDIUM, LOW
    category: str  # SALES, EXPENSES, INVENTORY, RECEIVABLES, VELOCITY
    observed_value: str
    baseline_value: str
    affected_entity: str
    suggested_action: str
    navigation_path: str
    created_at: str

class AnomalyReportResponse(BaseModel):
    anomalies: List[AnomalyItem]
    high_severity_count: int
    medium_severity_count: int

class ProductProfitabilityItem(BaseModel):
    product_id: str
    product_name: str
    sku: str
    category_name: str
    units_sold: int
    total_revenue: Decimal
    unit_selling_price: Decimal
    unit_cost_price: Decimal
    total_estimated_cost: Decimal
    gross_profit: Decimal
    gross_margin_percent: Decimal
    quadrant: str  # STAR, CASH_COW, OPPORTUNITY, UNDERPERFORMER

class ProfitabilityAnalyticsResponse(BaseModel):
    products: List[ProductProfitabilityItem]
    total_sales_revenue: Decimal
    total_estimated_cogs: Decimal
    overall_gross_profit: Decimal
    overall_gross_margin_percent: Decimal

class CashFlowItem(BaseModel):
    date_or_bucket: str
    source_type: str  # RECEIVABLE, PAYABLE, RECURRING
    entity_name: str
    amount: Decimal
    is_inflow: bool
    status: str

class CashFlowProjectionResponse(BaseModel):
    current_cash_position: Decimal
    projected_inflows_30d: Decimal
    projected_outflows_30d: Decimal
    projected_net_30d: Decimal
    schedule: List[CashFlowItem]
    assumptions: List[str]

class ActionCenterItem(BaseModel):
    id: str
    title: str
    description: str
    severity: str  # HIGH, MEDIUM, LOW
    category: str  # STOCK, RECEIVABLE, PROCUREMENT, GOAL
    action_label: str
    navigation_path: str
    entity_id: Optional[str] = None

class ActionCenterResponse(BaseModel):
    actions: List[ActionCenterItem]
    total_pending_actions: int
