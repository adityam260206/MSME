from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class StockAdjustRequest(BaseModel):
    quantity_delta: int = Field(..., description="Signed integer stock change (+/-)")
    movement_type: str = Field("ADJUSTMENT", pattern="^(ADJUSTMENT|RETURN)$")
    reason: str = Field(..., min_length=1, max_length=500)

class StockMovementResponse(BaseModel):
    id: str
    tenant_id: str
    product_id: str
    product_name: Optional[str] = None
    movement_type: str
    quantity: int
    previous_stock: int
    new_stock: int
    reason: str
    actor_id: str
    actor_name: Optional[str] = None
    reference_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
