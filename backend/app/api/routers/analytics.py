from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.core.deps import require_roles
from backend.app.models.user import User
from backend.app.schemas.analytics import (
    SalesAnalyticsResponse, InventoryAnalyticsResponse,
    ReplenishmentPlanResponse, AnomalyReportResponse,
    ProfitabilityAnalyticsResponse, CashFlowProjectionResponse,
    ActionCenterResponse,
)
from backend.app.schemas.common import BaseResponse
from backend.app.services.analytics_service import (
    get_sales_analytics, get_inventory_analytics,
    get_replenishment_planner, get_anomaly_report,
    get_product_profitability, get_cash_flow_projection,
    get_action_center,
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

@router.get("/replenishment-planner", response_model=BaseResponse[ReplenishmentPlanResponse])
def get_replenishment(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "OWNER", "MANAGER")),
):
    plan = get_replenishment_planner(db, current_user.tenant_id)
    return BaseResponse(
        success=True,
        message="Replenishment plan computed",
        data=plan,
    )

@router.get("/anomalies", response_model=BaseResponse[AnomalyReportResponse])
def get_anomalies(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "OWNER", "MANAGER")),
):
    anomalies = get_anomaly_report(db, current_user.tenant_id)
    return BaseResponse(
        success=True,
        message="Business anomalies report generated",
        data=anomalies,
    )

@router.get("/profitability", response_model=BaseResponse[ProfitabilityAnalyticsResponse])
def get_profitability(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "OWNER")),
):
    report = get_product_profitability(db, current_user.tenant_id)
    return BaseResponse(
        success=True,
        message="Product profitability intelligence retrieved",
        data=report,
    )

@router.get("/cash-flow-projection", response_model=BaseResponse[CashFlowProjectionResponse])
def get_cash_flow(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "OWNER")),
):
    projection = get_cash_flow_projection(db, current_user.tenant_id)
    return BaseResponse(
        success=True,
        message="Forward-looking cash flow projection computed",
        data=projection,
    )

@router.get("/action-center", response_model=BaseResponse[ActionCenterResponse])
def get_actions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "OWNER", "MANAGER")),
):
    actions = get_action_center(db, current_user.tenant_id)
    return BaseResponse(
        success=True,
        message="Action center recommendations retrieved",
        data=actions,
    )
