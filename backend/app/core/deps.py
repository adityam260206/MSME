from typing import Callable, List
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
import jwt
from backend.app.core.config import settings
from backend.app.core.errors import InvalidCredentialsException, ForbiddenException, AppException
from backend.app.core.security import decode_access_token
from backend.app.db.session import get_db
from backend.app.models.user import User

def get_current_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db),
) -> User:
    """Validate Bearer JWT and return active User instance."""
    if not authorization or not authorization.startswith("Bearer "):
        raise InvalidCredentialsException("Missing or malformed Authorization header")

    token = authorization.split(" ")[1]
    try:
        payload = decode_access_token(token)
    except jwt.ExpiredSignatureError:
        raise AppException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            message="Token has expired",
            error_code="TOKEN_EXPIRED",
        )
    except jwt.PyJWTError:
        raise InvalidCredentialsException("Invalid token signature or payload")

    user_id: str = payload.get("sub")
    tenant_id: str = payload.get("tenant_id")
    if not user_id or not tenant_id:
        raise InvalidCredentialsException("Token missing subject or tenant claims")

    user = db.query(User).filter(User.id == user_id, User.tenant_id == tenant_id).first()
    if not user:
        raise InvalidCredentialsException("User not found or invalid tenant context")
    if not user.is_active:
        raise ForbiddenException("User account is deactivated")

    return user

def require_roles(*allowed_roles: str) -> Callable[[User], User]:
    """Dependency factory ensuring user has one of the allowed roles."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise ForbiddenException(
                f"Role '{current_user.role}' is not authorized to access this resource"
            )
        return current_user
    return role_checker
