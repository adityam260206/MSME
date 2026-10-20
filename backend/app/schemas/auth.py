from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    username: str
    password: str

class UserProfileResponse(BaseModel):
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

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 86400  # 24 hours in seconds
    user: UserProfileResponse

class AuthMeResponse(BaseModel):
    user: UserProfileResponse
    role: str
    tenant_id: str
    capabilities: List[str]
