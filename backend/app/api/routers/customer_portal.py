from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.app.core.deps import get_db, get_current_customer
from backend.app.models.customer import Customer
from backend.app.schemas.common import BaseResponse, PaginatedResponse, PaginatedMeta
from backend.app.schemas.customer_portal import (
    CustomerRegisterRequest, CustomerLoginRequest, CustomerAuthResponse,
    CustomerProfileResponse, CustomerProfileUpdate
)
from backend.app.schemas.sale import SaleResponse
from backend.app.schemas.customer_rating import CustomerFeedbackCreate, CustomerFeedbackResponse
from backend.app.services.customer_portal_service import customer_portal_service
from backend.app.services.customer_rating_service import customer_rating_service

router = APIRouter(prefix="/customer-portal", tags=["Customer Portal"])

@router.post(
    "/register",
    response_model=BaseResponse[CustomerAuthResponse],
    status_code=status.HTTP_201_CREATED,
)
def customer_register(
    req: CustomerRegisterRequest,
    db: Session = Depends(get_db),
):
    """Register a new customer account and return authenticated session."""
    auth_res = customer_portal_service.register(db, req)
    return BaseResponse(
        success=True,
        message="Customer registration successful",
        data=auth_res,
    )

@router.post("/login", response_model=BaseResponse[CustomerAuthResponse])
def customer_login(
    req: CustomerLoginRequest,
    db: Session = Depends(get_db),
):
    """Authenticate customer with email and password."""
    auth_res = customer_portal_service.login(db, req)
    return BaseResponse(
        success=True,
        message="Customer login successful",
        data=auth_res,
    )

@router.get("/me", response_model=BaseResponse[CustomerProfileResponse])
def get_customer_me(
    current_customer: Customer = Depends(get_current_customer),
):
    """Retrieve authenticated customer profile and lifetime spend."""
    profile = CustomerProfileResponse(
        id=current_customer.id,
        tenant_id=current_customer.tenant_id,
        name=current_customer.name,
        email=current_customer.email,
        phone=current_customer.phone,
        total_spent=current_customer.total_spent,
        is_active=current_customer.is_active,
        created_at=current_customer.created_at.isoformat(),
    )
    return BaseResponse(
        success=True,
        message="Customer profile retrieved",
        data=profile,
    )

@router.put("/profile", response_model=BaseResponse[CustomerProfileResponse])
def update_profile(
    data: CustomerProfileUpdate,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    """Update contact information for the authenticated customer."""
    updated = customer_portal_service.update_profile(db, current_customer, data)
    return BaseResponse(
        success=True,
        message="Customer profile updated successfully",
        data=updated,
    )

@router.get("/orders", response_model=PaginatedResponse[SaleResponse])
def get_customer_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    """
    STRICT DATA ISOLATION:
    Retrieve purchase history strictly belonging to the authenticated customer.
    """
    orders, total = customer_portal_service.get_orders(
        db=db,
        customer=current_customer,
        page=page,
        limit=limit,
    )
    total_pages = (total + limit - 1) // limit if total > 0 else 1
    return PaginatedResponse(
        success=True,
        message="Customer orders retrieved",
        data=orders,
        meta=PaginatedMeta(total=total, page=page, limit=limit, total_pages=total_pages),
    )

@router.get("/orders/{sale_id}", response_model=BaseResponse[SaleResponse])
def get_customer_invoice_detail(
    sale_id: str,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    """
    STRICT DATA ISOLATION:
    Retrieve single itemized invoice. Rejects access if invoice belongs to another customer.
    """
    sale = customer_portal_service.get_order_invoice(db, current_customer, sale_id)
    return BaseResponse(
        success=True,
        message="Customer invoice retrieved",
        data=sale,
    )

@router.post(
    "/orders/{sale_id}/feedback",
    response_model=BaseResponse[CustomerFeedbackResponse],
    status_code=status.HTTP_201_CREATED,
)
def submit_order_feedback(
    sale_id: str,
    data: CustomerFeedbackCreate,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    """
    Submit customer rating (1-5) and review for this specific verified purchase.
    """
    data.sale_id = sale_id
    feedback = customer_rating_service.submit_feedback(
        db=db,
        tenant_id=current_customer.tenant_id,
        customer_id=current_customer.id,
        data=data,
        submitted_by_role="CUSTOMER",
    )
    return BaseResponse(
        success=True,
        message="Review and rating submitted successfully",
        data=feedback,
    )
