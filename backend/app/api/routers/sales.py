from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.core.deps import get_current_user, require_roles
from backend.app.models.user import User
from backend.app.schemas.sale import SaleCreate, SaleResponse
from backend.app.schemas.common import BaseResponse, PaginatedResponse, PaginatedMeta
from backend.app.services.sale_service import (
    create_sale, cancel_sale, get_sale, list_sales
)

router = APIRouter(prefix="/business/sales", tags=["Sales & POS Checkout"])

@router.get("", response_model=PaginatedResponse[SaleResponse])
def get_sales(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sales, total = list_sales(db, current_user.tenant_id, page=page, limit=limit)
    total_pages = (total + limit - 1) // limit if total > 0 else 1
    return PaginatedResponse(
        success=True,
        message="Sales retrieved",
        data=sales,
        meta=PaginatedMeta(total=total, page=page, limit=limit, total_pages=total_pages),
    )

@router.get("/{sale_id}", response_model=BaseResponse[SaleResponse])
def get_sale_by_id(
    sale_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sale = get_sale(db, current_user.tenant_id, sale_id)
    return BaseResponse(
        success=True,
        message="Sale invoice retrieved",
        data=sale,
    )

@router.post("", response_model=BaseResponse[SaleResponse])
def checkout_sale(
    req: SaleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # All authenticated roles can checkout
):
    sale = create_sale(db, current_user.tenant_id, current_user.id, req)
    return BaseResponse(
        success=True,
        message="Sale checkout completed successfully",
        data=sale,
    )

@router.post("/{sale_id}/cancel", response_model=BaseResponse[SaleResponse])
def cancel_existing_sale(
    sale_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "OWNER", "MANAGER")),
):
    cancelled = cancel_sale(db, current_user.tenant_id, sale_id, current_user.id)
    return BaseResponse(
        success=True,
        message="Sale cancelled and stock reversed successfully",
        data=cancelled,
    )
