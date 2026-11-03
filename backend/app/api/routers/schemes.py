from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.deps import get_db, get_current_user
from backend.app.models.user import User
from backend.app.schemas.common import BaseResponse
from backend.app.schemas.scheme import (
    SchemeDetailResponse, SchemeAssessmentRequest, SchemeAssessmentSummaryResponse
)
from backend.app.services.scheme_eligibility_service import scheme_eligibility_service

router = APIRouter(prefix="/schemes", tags=["Government & Banking Schemes"])

@router.get("", response_model=BaseResponse[List[SchemeDetailResponse]])
def get_schemes_catalog(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all active official Indian MSME government & banking schemes."""
    schemes = scheme_eligibility_service.list_all_schemes(db)
    return BaseResponse(
        success=True,
        message=f"Retrieved {len(schemes)} official MSME government/banking schemes",
        data=schemes,
    )

@router.post("/evaluate", response_model=BaseResponse[SchemeAssessmentSummaryResponse])
def evaluate_scheme_eligibility(
    req: SchemeAssessmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Assess enterprise profile against verified scheme criteria."""
    result = scheme_eligibility_service.evaluate_eligibility(
        db=db,
        tenant_id=current_user.tenant_id,
        req=req,
        evaluator_id=current_user.id,
    )
    return BaseResponse(
        success=True,
        message="Scheme eligibility evaluation completed",
        data=result,
    )
