from typing import List
from sqlalchemy.orm import Session
from backend.app.core.errors import AppException
from backend.app.core.security import hash_password
from backend.app.models.user import User
from backend.app.schemas.user import UserCreateRequest, UserResponse

def create_user(db: Session, tenant_id: str, req: UserCreateRequest) -> UserResponse:
    # Check if username or email already exists
    existing = db.query(User).filter(
        (User.username == req.username) | (User.email == req.email)
    ).first()
    if existing:
        raise AppException(
            status_code=400,
            message="Username or email already registered",
            error_code="USER_EXISTS",
        )

    user = User(
        tenant_id=tenant_id,
        username=req.username,
        email=req.email,
        password_hash=hash_password(req.password),
        full_name=req.full_name,
        role=req.role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)

def list_users(db: Session, tenant_id: str) -> List[UserResponse]:
    users = db.query(User).filter(User.tenant_id == tenant_id).order_by(User.created_at.desc()).all()
    return [UserResponse.model_validate(u) for u in users]
