from typing import Optional
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class BusinessGoalCreate(BaseModel):
    target_month: str = Field(..., description="Target month in YYYY-MM format", pattern=r"^\d{4}-\d{2}$")
    target_revenue: Decimal = Field(..., ge=0, description="Target revenue in default currency")
    target_sales_volume: int = Field(0, ge=0, description="Target sales volume (units)")
    notes: Optional[str] = None

class BusinessGoalUpdate(BaseModel):
    target_revenue: Optional[Decimal] = Field(None, ge=0)
    target_sales_volume: Optional[int] = Field(None, ge=0)
    notes: Optional[str] = None

class BusinessGoalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tenant_id: str
    target_month: str
    target_revenue: Decimal
    target_sales_volume: int
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class BusinessGoalProgress(BaseModel):
    target_month: str
    target_revenue: Decimal
    actual_revenue: Decimal
    revenue_achievement_rate: Decimal
    remaining_revenue_deficit: Decimal
    target_sales_volume: int
    actual_sales_volume: int
    volume_achievement_rate: Decimal
    is_revenue_target_met: bool
    is_volume_target_met: bool
