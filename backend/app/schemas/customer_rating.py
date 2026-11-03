from decimal import Decimal
from typing import List, Optional, Dict
from pydantic import BaseModel, Field

class CustomerFeedbackCreate(BaseModel):
    sale_id: Optional[str] = Field(default=None, description="Completed sale ID being reviewed")
    rating: int = Field(ge=1, le=5, description="Numerical rating between 1 and 5 stars")
    comment: Optional[str] = Field(default=None, description="Review text or customer feedback")

class CustomerFeedbackResponse(BaseModel):
    id: str
    customer_id: str
    sale_id: Optional[str]
    invoice_number: Optional[str]
    rating: int
    comment: Optional[str]
    submitted_by_role: str
    created_at: str

class CustomerFeedbackSummary(BaseModel):
    customer_id: str
    customer_name: str
    average_rating: Decimal
    total_reviews: int
    rating_distribution: Dict[str, int]  # "5_star": count, etc.
    recent_reviews: List[CustomerFeedbackResponse]

class CustomerReliabilityResponse(BaseModel):
    customer_id: str
    customer_name: str
    reliability_score: Decimal  # 0 to 100
    reliability_tier: str       # PLATINUM, GOLD, SILVER, BRONZE, NEW_CUSTOMER
    total_orders_count: int
    completed_orders_count: int
    cancelled_orders_count: int
    completion_rate_pct: Decimal
    total_lifetime_spent: Decimal
    average_order_value: Decimal
    days_as_customer: int
    reliability_summary: str
    contributing_factors: List[str]
