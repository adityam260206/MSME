from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.core.deps import require_roles
from backend.app.models.user import User
from backend.app.schemas.analytics import SalesAnalyticsResponse, InventoryAnalyticsResponse
from backend.app.schemas.common import BaseResponse
from backend.app.services.analytics_service import (
    get_sales_analytics, get_inventory_analytics
)

router = APIRouter(prefix="/analytics", tags=["Business Intelligence & Analytics"])

@router.get("/sales", response_model=BaseResponse[SalesAnalyticsResponse])
def get_sales(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "OWNER", "MANAGER")),
):
    analytics = get_sales_analytics(db, current_user.tenant_id, role=current_user.role)
    return BaseResponse(
        success=True,
        message="Sales analytics retrieved",
        data=analytics,
    )

@router.get("/inventory", response_model=BaseResponse[InventoryAnalyticsResponse])
def get_inventory(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "OWNER", "MANAGER")),
):
    analytics = get_inventory_analytics(db, current_user.tenant_id)
    return BaseResponse(
        success=True,
        message="Inventory analytics and ROP retrieved",
        data=analytics,
    )
