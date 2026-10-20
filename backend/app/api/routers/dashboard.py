from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.core.deps import get_current_user
from backend.app.models.user import User
from backend.app.schemas.analytics import DashboardSummaryResponse
from backend.app.schemas.common import BaseResponse
from backend.app.services.analytics_service import get_dashboard_summary

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=BaseResponse[DashboardSummaryResponse])
def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    summary = get_dashboard_summary(db, current_user.tenant_id, role=current_user.role)
    return BaseResponse(
        success=True,
        message="Dashboard summary retrieved",
        data=summary,
    )
