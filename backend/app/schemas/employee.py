from typing import Optional
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr

class EmployeeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    role: str = Field(..., min_length=1, max_length=100)
    department: str = Field(..., min_length=1, max_length=100)
    monthly_base_salary: Decimal = Field(..., gt=0)

class EmployeeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    role: Optional[str] = Field(None, min_length=1, max_length=100)
    department: Optional[str] = Field(None, min_length=1, max_length=100)
    monthly_base_salary: Optional[Decimal] = Field(None, gt=0)
    is_active: Optional[bool] = None

class EmployeeResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    email: str
    role: str
    department: str
    monthly_base_salary: Optional[Decimal] = None  # Masked/None for MANAGER
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
