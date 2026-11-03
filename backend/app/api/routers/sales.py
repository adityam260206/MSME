from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.core.deps import get_current_user, require_roles
from backend.app.models.user import User
from backend.app.schemas.sale import (
    SaleCreate, SaleResponse, RecoveredInvoiceResponse, InvoiceAuditTrailItem
)
from backend.app.schemas.common import BaseResponse, PaginatedResponse, PaginatedMeta
from backend.app.services.sale_service import (
    create_sale, cancel_sale, get_sale, list_sales,
    search_historical_invoices, recover_historical_invoice, get_invoice_audit_trail
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

@router.get("/historical/search", response_model=PaginatedResponse[SaleResponse])
def search_historical(
    query: Optional[str] = Query(None, description="Search by invoice number or customer name"),
    customer_id: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    status: Optional[str] = Query(None),
    payment_status: Optional[str] = Query(None),
    payment_method: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Search historical invoices by multiple parameters.
    Guarantees strict read-only financial integrity without duplicating transactions.
    """
    sales, total = search_historical_invoices(
        db=db,
        tenant_id=current_user.tenant_id,
        query_str=query,
        customer_id=customer_id,
        start_date=start_date,
        end_date=end_date,
        status_filter=status,
        payment_status=payment_status,
        payment_method=payment_method,
        page=page,
        limit=limit,
    )
    total_pages = (total + limit - 1) // limit if total > 0 else 1
    return PaginatedResponse(
        success=True,
        message="Historical invoices retrieved",
        data=sales,
        meta=PaginatedMeta(total=total, page=page, limit=limit, total_pages=total_pages),
    )

@router.get("/{sale_id}/recover", response_model=BaseResponse[RecoveredInvoiceResponse])
def recover_invoice_document(
    sale_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Recover an authentic historical invoice snapshot with preserved original prices,
    taxes, and discounts. Automatically logs the recovery action into the audit trail.
    """
    recovered = recover_historical_invoice(
        db=db,
        tenant_id=current_user.tenant_id,
        sale_id=sale_id,
        actor_name=current_user.full_name,
        actor_id=current_user.id,
    )
    return BaseResponse(
        success=True,
        message="Historical invoice recovered with audit verification",
        data=recovered,
    )

@router.get("/{sale_id}/audit-trail", response_model=BaseResponse[List[InvoiceAuditTrailItem]])
def get_sale_audit_trail(
    sale_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve full chronological audit history for a sale invoice."""
    trail = get_invoice_audit_trail(db, current_user.tenant_id, sale_id)
    return BaseResponse(
        success=True,
        message="Invoice audit trail retrieved",
        data=trail,
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
