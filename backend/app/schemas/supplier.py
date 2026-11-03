from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, field_validator

class SupplierCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

    @field_validator("email", mode="before")
    @classmethod
    def sanitize_email(cls, v):
        if v == "" or (isinstance(v, str) and not v.strip()):
            return None
        return v

class SupplierUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("email", mode="before")
    @classmethod
    def sanitize_email(cls, v):
        if v == "" or (isinstance(v, str) and not v.strip()):
            return None
        return v

class SupplierResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
