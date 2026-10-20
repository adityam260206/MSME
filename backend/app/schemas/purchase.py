from typing import List, Optional
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field

class PurchaseItemCreate(BaseModel):
    product_id: str
    quantity: int = Field(..., gt=0)
    unit_cost: Decimal = Field(..., gt=0)

class PurchaseCreate(BaseModel):
    supplier_id: str
    items: List[PurchaseItemCreate] = Field(..., min_length=1)
    tax_rate: Decimal = Field(Decimal("0.00"), ge=0, le=100)
    discount_amount: Decimal = Field(Decimal("0.00"), ge=0)
    payment_method: str = Field("CASH")

class PurchaseItemResponse(BaseModel):
    id: str
    product_id: str
    product_name: str
    quantity: int
    unit_cost: Decimal
    line_total: Decimal

    class Config:
        from_attributes = True

class PurchaseResponse(BaseModel):
    id: str
    tenant_id: str
    supplier_id: str
    supplier_name: Optional[str] = None
    purchase_number: str
    status: str
    subtotal: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    payment_method: str
    payment_status: str
    reference_grn: str
    actor_id: str
    created_at: datetime
    cancelled_at: Optional[datetime] = None
    items: List[PurchaseItemResponse] = []

    class Config:
        from_attributes = True
