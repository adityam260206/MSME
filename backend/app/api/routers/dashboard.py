from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.core.deps import get_current_user, require_roles
from backend.app.models.user import User
from backend.app.schemas.analytics import DashboardSummaryResponse
from backend.app.schemas.goal import BusinessGoalCreate, BusinessGoalProgress, BusinessGoalResponse
from backend.app.schemas.common import BaseResponse
from backend.app.services.analytics_service import get_dashboard_summary
from backend.app.services.goal_service import goal_service

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

@router.get("/goals", response_model=BaseResponse[BusinessGoalProgress])
def get_goals_progress(
    month: Optional[str] = Query(None, description="Month in YYYY-MM format"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not month:
        month = datetime.now(timezone.utc).strftime("%Y-%m")
    progress = goal_service.get_progress(db, current_user.tenant_id, month)
    return BaseResponse(
        success=True,
        message="Business goals progress retrieved",
        data=progress,
    )

@router.post("/goals", response_model=BaseResponse[BusinessGoalResponse])
def set_business_goal(
    data: BusinessGoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "OWNER")),
):
    goal = goal_service.set_goal(db, current_user.tenant_id, data)
    return BaseResponse(
        success=True,
        message="Business goal successfully configured",
        data=goal,
    )
