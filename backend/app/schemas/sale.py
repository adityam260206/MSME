from typing import List, Optional
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field

class SaleItemCreate(BaseModel):
    product_id: str
    quantity: int = Field(..., gt=0)
    unit_price: Optional[Decimal] = Field(None, gt=0)

class SaleCreate(BaseModel):
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    items: List[SaleItemCreate] = Field(..., min_length=1)
    tax_rate: Decimal = Field(Decimal("0.00"), ge=0, le=100)
    discount_amount: Decimal = Field(Decimal("0.00"), ge=0)
    payment_method: str = Field("CASH")

class SaleItemResponse(BaseModel):
    id: str
    product_id: str
    product_name: str
    sku: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal

    class Config:
        from_attributes = True

class SaleResponse(BaseModel):
    id: str
    tenant_id: str
    customer_id: Optional[str] = None
    customer_name: str
    invoice_number: str
    status: str
    subtotal: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    payment_method: str
    payment_status: str
    actor_id: str
    created_at: datetime
    cancelled_at: Optional[datetime] = None
    items: List[SaleItemResponse] = []

    class Config:
        from_attributes = True

class InvoiceAuditTrailItem(BaseModel):
    id: str
    action: str
    actor_name: str
    timestamp: datetime
    details: Optional[str] = None

class RecoveredInvoiceResponse(BaseModel):
    sale: SaleResponse
    is_recovered_document: bool = True
    original_invoice_number: str
    original_created_at: datetime
    recovery_timestamp: datetime
    recovery_notice: str
    retrieved_by: str
    audit_trail: List[InvoiceAuditTrailItem] = []
