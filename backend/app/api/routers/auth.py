from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.core.deps import get_current_user
from backend.app.models.user import User
from backend.app.schemas.auth import LoginRequest, TokenResponse, AuthMeResponse
from backend.app.schemas.common import BaseResponse
from backend.app.services.auth_service import authenticate_user, get_auth_me

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=BaseResponse[TokenResponse])
def login(req: LoginRequest, db: Session = Depends(get_db)):
    token_data = authenticate_user(db, req)
    return BaseResponse(
        success=True,
        message="Login successful",
        data=token_data,
    )

@router.get("/me", response_model=BaseResponse[AuthMeResponse])
def me(current_user: User = Depends(get_current_user)):
    auth_data = get_auth_me(current_user)
    return BaseResponse(
        success=True,
        message="Current user profile retrieved",
        data=auth_data,
    )
