from typing import Optional
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr

class CustomerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None

class CustomerResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    total_spent: Decimal = Decimal("0.00")
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
