from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.core.deps import require_roles
from backend.app.models.user import User
from backend.app.schemas.user import UserCreateRequest, UserResponse
from backend.app.schemas.common import BaseResponse
from backend.app.services.user_service import create_user, list_users

router = APIRouter(prefix="/users", tags=["User Management"])

@router.get("", response_model=BaseResponse[List[UserResponse]])
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "OWNER")),
):
    users = list_users(db, current_user.tenant_id)
    return BaseResponse(
        success=True,
        message="Users retrieved",
        data=users,
    )

@router.post("", response_model=BaseResponse[UserResponse])
def add_user(
    req: UserCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "OWNER")),
):
    user = create_user(db, current_user.tenant_id, req)
    return BaseResponse(
        success=True,
        message="User provisioned successfully",
        data=user,
    )
