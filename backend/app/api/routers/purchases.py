from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.core.deps import require_roles
from backend.app.models.user import User
from backend.app.schemas.purchase import PurchaseCreate, PurchaseResponse
from backend.app.schemas.common import BaseResponse, PaginatedResponse, PaginatedMeta
from backend.app.services.purchase_service import (
    create_purchase, cancel_purchase, list_purchases
)

router = APIRouter(prefix="/business/purchases", tags=["Purchases & Procurement"])

@router.get("", response_model=PaginatedResponse[PurchaseResponse])
def get_purchases(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "OWNER", "MANAGER")),
):
    purchases, total = list_purchases(db, current_user.tenant_id, page=page, limit=limit)
    total_pages = (total + limit - 1) // limit if total > 0 else 1
    return PaginatedResponse(
        success=True,
        message="Purchases retrieved",
        data=purchases,
        meta=PaginatedMeta(total=total, page=page, limit=limit, total_pages=total_pages),
    )

@router.post("", response_model=BaseResponse[PurchaseResponse])
def add_purchase(
    req: PurchaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "OWNER", "MANAGER")),
):
    purchase = create_purchase(db, current_user.tenant_id, current_user.id, req)
    return BaseResponse(
        success=True,
        message="Purchase completed successfully",
        data=purchase,
    )

@router.post("/{purchase_id}/cancel", response_model=BaseResponse[PurchaseResponse])
def cancel_existing_purchase(
    purchase_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "OWNER")),
):
    cancelled = cancel_purchase(db, current_user.tenant_id, purchase_id, current_user.id)
    return BaseResponse(
        success=True,
        message="Purchase cancelled successfully",
        data=cancelled,
    )
