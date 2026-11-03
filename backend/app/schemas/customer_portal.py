from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, EmailStr

class CustomerRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    password: str = Field(..., min_length=6, max_length=100)
    tenant_id: Optional[str] = Field(None)

class CustomerLoginRequest(BaseModel):
    email: str
    password: str
    tenant_id: Optional[str] = None

class CustomerProfileResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    email: Optional[str]
    phone: Optional[str]
    total_spent: Decimal
    is_active: bool
    created_at: str

class CustomerAuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    customer: CustomerProfileResponse

class CustomerProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
