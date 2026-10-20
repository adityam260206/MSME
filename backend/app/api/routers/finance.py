from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.core.deps import require_roles
from backend.app.models.user import User
from backend.app.schemas.finance import (
    FinancialTransactionCreate, FinancialTransactionResponse, FinanceSummaryResponse
)
from backend.app.schemas.common import BaseResponse, PaginatedResponse, PaginatedMeta
from backend.app.services.finance_service import (
    get_finance_summary, list_financial_transactions, create_manual_transaction
)

router = APIRouter(prefix="/finance", tags=["Finance & Accounting"])

@router.get("/summary", response_model=BaseResponse[FinanceSummaryResponse])
def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "OWNER")),  # Strict ADMIN/OWNER only
):
    summary = get_finance_summary(db, current_user.tenant_id)
    return BaseResponse(
        success=True,
        message="Finance summary retrieved",
        data=summary,
    )

@router.get("/transactions", response_model=PaginatedResponse[FinancialTransactionResponse])
def get_transactions(
    type: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "OWNER")),  # Strict ADMIN/OWNER only
):
    transactions, total = list_financial_transactions(
        db,
        current_user.tenant_id,
        trans_type=type,
        category=category,
        start_date=start_date,
        end_date=end_date,
        page=page,
        limit=limit,
    )
    total_pages = (total + limit - 1) // limit if total > 0 else 1
    return PaginatedResponse(
        success=True,
        message="Financial transactions retrieved",
        data=transactions,
        meta=PaginatedMeta(total=total, page=page, limit=limit, total_pages=total_pages),
    )

@router.post("/transactions", response_model=BaseResponse[FinancialTransactionResponse])
def add_transaction(
    req: FinancialTransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "OWNER")),
):
    tx = create_manual_transaction(db, current_user.tenant_id, current_user.id, req)
    return BaseResponse(
        success=True,
        message="Financial transaction recorded successfully",
        data=tx,
    )
