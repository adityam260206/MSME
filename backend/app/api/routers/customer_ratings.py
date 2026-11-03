from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.app.core.deps import get_db, get_current_user
from backend.app.models.user import User
from backend.app.schemas.common import BaseResponse
from backend.app.schemas.customer_rating import (
    CustomerFeedbackCreate, CustomerFeedbackResponse, CustomerFeedbackSummary,
    CustomerReliabilityResponse
)
from backend.app.services.customer_rating_service import customer_rating_service

router = APIRouter(prefix="/customers", tags=["Customer CRM & Ratings"])

@router.post(
    "/{customer_id}/feedback",
    response_model=BaseResponse[CustomerFeedbackResponse],
    status_code=status.HTTP_201_CREATED,
)
def submit_customer_feedback(
    customer_id: str,
    data: CustomerFeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a customer review/rating (1-5 stars) linked to a verified transaction."""
    feedback = customer_rating_service.submit_feedback(
        db=db,
        tenant_id=current_user.tenant_id,
        customer_id=customer_id,
        data=data,
        submitted_by_role=current_user.role,
    )
    return BaseResponse(
        success=True,
        message="Customer feedback submitted successfully",
        data=feedback,
    )

@router.get(
    "/{customer_id}/feedback",
    response_model=BaseResponse[CustomerFeedbackSummary],
)
def get_customer_feedback_history(
    customer_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve customer rating breakdown, average score, and reviews list."""
    summary = customer_rating_service.get_feedback_summary(
        db=db,
        tenant_id=current_user.tenant_id,
        customer_id=customer_id,
    )
    return BaseResponse(
        success=True,
        message="Customer feedback summary retrieved",
        data=summary,
    )

@router.get(
    "/{customer_id}/reliability",
    response_model=BaseResponse[CustomerReliabilityResponse],
)
def get_customer_reliability_indicator(
    customer_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calculate objective internal customer reliability score and tier."""
    result = customer_rating_service.calculate_reliability(
        db=db,
        tenant_id=current_user.tenant_id,
        customer_id=customer_id,
    )
    return BaseResponse(
        success=True,
        message="Customer reliability indicator calculated",
        data=result,
    )
