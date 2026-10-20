from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.core.deps import require_roles
from backend.app.models.user import User
from backend.app.schemas.inventory import StockAdjustRequest, StockMovementResponse
from backend.app.schemas.common import BaseResponse, PaginatedResponse, PaginatedMeta
from backend.app.services.inventory_service import adjust_product_stock, list_stock_movements

router = APIRouter(prefix="/inventory", tags=["Inventory Movements & Adjustments"])

@router.post("/products/{product_id}/adjust-stock", response_model=BaseResponse[StockMovementResponse])
def adjust_stock(
    product_id: str,
    req: StockAdjustRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "OWNER", "MANAGER")),
):
    movement = adjust_product_stock(
        db, current_user.tenant_id, product_id, current_user.id, req
    )
    return BaseResponse(
        success=True,
        message="Stock adjusted successfully",
        data=movement,
    )

@router.get("/movements", response_model=PaginatedResponse[StockMovementResponse])
def get_movements(
    product_id: Optional[str] = Query(None),
    movement_type: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "OWNER", "MANAGER")),
):
    movements, total = list_stock_movements(
        db,
        current_user.tenant_id,
        product_id=product_id,
        movement_type=movement_type,
        start_date=start_date,
        end_date=end_date,
        page=page,
        limit=limit,
    )
    total_pages = (total + limit - 1) // limit if total > 0 else 1
    return PaginatedResponse(
        success=True,
        message="Stock movements retrieved",
        data=movements,
        meta=PaginatedMeta(total=total, page=page, limit=limit, total_pages=total_pages),
    )
