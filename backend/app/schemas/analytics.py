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
    rop_recommendations: List[ROPRecommendation]
    velocity_classification: List[VelocityItem]
