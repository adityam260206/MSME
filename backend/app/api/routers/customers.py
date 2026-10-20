from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.core.deps import get_current_user, require_roles
from backend.app.models.user import User
from backend.app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse
from backend.app.schemas.common import BaseResponse
from backend.app.services.customer_service import (
    create_customer, list_customers, get_customer_detail, update_customer
)

router = APIRouter(prefix="/business/customers", tags=["Customer CRM"])

@router.get("", response_model=BaseResponse[List[CustomerResponse]])
def get_customers(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    customers = list_customers(db, current_user.tenant_id, search=search)
    return BaseResponse(
        success=True,
        message="Customers retrieved",
        data=customers,
    )

@router.get("/{customer_id}", response_model=BaseResponse[Dict[str, Any]])
def get_customer(
    customer_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    detail = get_customer_detail(db, current_user.tenant_id, customer_id)
    return BaseResponse(
        success=True,
        message="Customer detail retrieved",
        data=detail,
    )

@router.post("", response_model=BaseResponse[CustomerResponse])
def add_customer(
    req: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # All authenticated roles can register customer
):
    customer = create_customer(db, current_user.tenant_id, req)
    return BaseResponse(
        success=True,
        message="Customer registered successfully",
        data=customer,
    )

@router.put("/{customer_id}", response_model=BaseResponse[CustomerResponse])
def edit_customer(
    customer_id: str,
    req: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "OWNER", "MANAGER")),
):
    customer = update_customer(db, current_user.tenant_id, customer_id, req)
    return BaseResponse(
        success=True,
        message="Customer updated successfully",
        data=customer,
    )
