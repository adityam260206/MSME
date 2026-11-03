from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.deps import get_db, get_current_user, require_role
from backend.app.models.user import User
from backend.app.schemas.common import BaseResponse
from backend.app.schemas.credit_risk import (
    CreditRiskEvaluationResponse, CreditRiskHistoryItem
)
from backend.app.services.credit_risk_service import credit_risk_service

router = APIRouter(prefix="/finance/credit-risk", tags=["Enterprise Credit Risk"])

@router.get(
    "/evaluate",
    response_model=BaseResponse[CreditRiskEvaluationResponse],
    dependencies=[Depends(require_role(["ADMIN", "OWNER"]))],
)
@router.post(
    "/evaluate",
    response_model=BaseResponse[CreditRiskEvaluationResponse],
    dependencies=[Depends(require_role(["ADMIN", "OWNER"]))],
)
def run_credit_risk_evaluation(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run an explainable multi-factor enterprise credit risk evaluation."""
    result = credit_risk_service.evaluate_risk(
        db=db,
        tenant_id=current_user.tenant_id,
        evaluator=current_user,
    )
    return BaseResponse(
        success=True,
        message="Enterprise credit risk evaluation completed successfully",
        data=result,
    )

@router.get(
    "/latest",
    response_model=BaseResponse[Optional[CreditRiskEvaluationResponse]],
    dependencies=[Depends(require_role(["ADMIN", "OWNER"]))],
)
def get_latest_evaluation(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve the most recent credit risk assessment."""
    result = credit_risk_service.get_latest_risk_score(db, current_user.tenant_id)
    if not result:
        # If no score exists yet, run an initial evaluation
        result = credit_risk_service.evaluate_risk(db, current_user.tenant_id, current_user)
    return BaseResponse(
        success=True,
        message="Latest credit risk score retrieved",
        data=result,
    )

@router.get(
    "/history",
    response_model=BaseResponse[List[CreditRiskHistoryItem]],
    dependencies=[Depends(require_role(["ADMIN", "OWNER"]))],
)
def get_evaluation_history(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve historical credit risk scores."""
    history = credit_risk_service.get_score_history(db, current_user.tenant_id, limit=limit)
    return BaseResponse(
        success=True,
        message="Credit risk history retrieved",
        data=history,
    )
