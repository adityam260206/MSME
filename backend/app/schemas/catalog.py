from typing import Optional
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field, field_validator

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    parent_id: Optional[str] = None

    @field_validator("parent_id", mode="before")
    @classmethod
    def sanitize_parent(cls, v):
        if v == "" or (isinstance(v, str) and not v.strip()):
            return None
        return v

class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    parent_id: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("parent_id", mode="before")
    @classmethod
    def sanitize_parent(cls, v):
        if v == "" or (isinstance(v, str) and not v.strip()):
            return None
        return v

class CategoryResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    description: Optional[str] = None
    parent_id: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    sku: str = Field(..., min_length=1, max_length=100)
    category_id: str
    cost_price: Decimal = Field(..., gt=0)
    selling_price: Decimal = Field(..., gt=0)
    stock_quantity: int = Field(0, ge=0)
    min_stock_level: int = Field(5, ge=0)
    lead_time_days: int = Field(7, gt=0)
    safety_stock: int = Field(10, ge=0)

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    category_id: Optional[str] = None
    cost_price: Optional[Decimal] = Field(None, gt=0)
    selling_price: Optional[Decimal] = Field(None, gt=0)
    min_stock_level: Optional[int] = Field(None, ge=0)
    lead_time_days: Optional[int] = Field(None, gt=0)
    safety_stock: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None

class ProductResponse(BaseModel):
    id: str
    tenant_id: str
    category_id: str
    category_name: Optional[str] = None
    name: str
    sku: str
    cost_price: Optional[Decimal] = None  # None for STAFF
    selling_price: Decimal
    stock_quantity: int
    min_stock_level: int
    lead_time_days: int
    safety_stock: int
    stock_status: Optional[str] = "IN_STOCK"  # OUT_OF_STOCK, LOW_STOCK, IN_STOCK
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
