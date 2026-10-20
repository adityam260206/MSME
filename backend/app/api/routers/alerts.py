from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.core.deps import get_current_user
from backend.app.models.user import User
from backend.app.schemas.alert import AlertResponse
from backend.app.schemas.common import BaseResponse
from backend.app.services.alert_service import (
    evaluate_and_get_alerts, mark_alert_read
)

router = APIRouter(prefix="/alerts", tags=["Inventory Alerts"])

@router.get("", response_model=BaseResponse[List[AlertResponse]])
def get_alerts(
    is_read: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alerts = evaluate_and_get_alerts(db, current_user.tenant_id, is_read=is_read)
    return BaseResponse(
        success=True,
        message="Alerts retrieved",
        data=alerts,
    )

@router.post("/{alert_id}/read", response_model=BaseResponse[AlertResponse])
def read_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alert = mark_alert_read(db, current_user.tenant_id, alert_id)
    return BaseResponse(
        success=True,
        message="Alert marked as read",
        data=alert,
    )
