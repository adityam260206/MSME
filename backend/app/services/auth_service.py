from sqlalchemy.orm import Session
from backend.app.core.errors import InvalidCredentialsException, ForbiddenException
from backend.app.core.security import verify_password, create_access_token
from backend.app.models.user import User
from backend.app.schemas.auth import LoginRequest, TokenResponse, UserProfileResponse, AuthMeResponse

ROLE_CAPABILITIES = {
    "ADMIN": [
        "manage_users", "manage_catalog", "adjust_stock", "view_movements",
        "manage_suppliers", "manage_purchases", "cancel_purchases",
        "manage_sales", "cancel_sales", "manage_customers", "view_finance",
        "manage_employees", "view_salary", "view_reports", "export_reports",
        "view_analytics", "view_alerts"
    ],
    "OWNER": [
        "manage_users", "manage_catalog", "adjust_stock", "view_movements",
        "manage_suppliers", "manage_purchases", "cancel_purchases",
        "manage_sales", "cancel_sales", "manage_customers", "view_finance",
        "manage_employees", "view_salary", "view_reports", "export_reports",
        "view_analytics", "view_alerts"
    ],
    "MANAGER": [
        "manage_catalog", "adjust_stock", "view_movements",
        "manage_suppliers", "manage_purchases",
        "manage_sales", "cancel_sales", "manage_customers",
        "view_employee_directory", "view_operational_reports",
        "view_operational_analytics", "view_alerts"
    ],
    "STAFF": [
        "view_catalog", "pos_checkout", "register_customers",
        "view_customers", "view_operational_dashboard"
    ],
}

def authenticate_user(db: Session, req: LoginRequest) -> TokenResponse:
    user = db.query(User).filter(User.username == req.username).first()
    if not user:
        raise InvalidCredentialsException()

    if not verify_password(req.password, user.password_hash):
        raise InvalidCredentialsException()

    if not user.is_active:
        raise ForbiddenException("User account is deactivated")

    token = create_access_token(
        subject=user.id,
        role=user.role,
        tenant_id=user.tenant_id,
        extra_claims={"username": user.username, "full_name": user.full_name},
    )

    profile = UserProfileResponse.model_validate(user)
    return TokenResponse(access_token=token, user=profile)

def get_auth_me(user: User) -> AuthMeResponse:
    capabilities = ROLE_CAPABILITIES.get(user.role, [])
    profile = UserProfileResponse.model_validate(user)
    return AuthMeResponse(
        user=profile,
        role=user.role,
        tenant_id=user.tenant_id,
        capabilities=capabilities,
    )
