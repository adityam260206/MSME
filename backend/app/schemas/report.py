from typing import List, Optional
from decimal import Decimal
from pydantic import BaseModel, Field

class SalesReportRequest(BaseModel):
    start_date: str = Field(..., description="YYYY-MM-DD")
    end_date: str = Field(..., description="YYYY-MM-DD")
    category_id: Optional[str] = None
    format: str = Field("json", pattern="^(json|csv)$")

class SalesReportItem(BaseModel):
    sale_id: str
    invoice_number: str
    created_at: str
    customer_name: str
    category_name: str
    product_name: str
    sku: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal

class SalesReportSummary(BaseModel):
    total_sales_count: int
    total_units_sold: int
    total_revenue: Decimal
    total_tax: Decimal
    total_discount: Decimal

class SalesReportResponse(BaseModel):
    items: List[SalesReportItem]
    summary: SalesReportSummary
