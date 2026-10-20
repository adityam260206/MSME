from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

class UserCreateRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=1, max_length=100)
    role: str = Field(..., pattern="^(ADMIN|OWNER|MANAGER|STAFF)$")

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    role: str
    tenant_id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
