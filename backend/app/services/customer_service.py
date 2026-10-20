from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_
from backend.app.core.errors import NotFoundException
from backend.app.models.customer import Customer
from backend.app.models.sale import Sale
from backend.app.schemas.customer import (
    CustomerCreate, CustomerUpdate, CustomerResponse
)
from backend.app.schemas.sale import SaleResponse, SaleItemResponse

def create_customer(db: Session, tenant_id: str, req: CustomerCreate) -> CustomerResponse:
    customer = Customer(
        tenant_id=tenant_id,
        name=req.name,
        email=req.email,
        phone=req.phone,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return CustomerResponse.model_validate(customer)

def list_customers(
    db: Session, tenant_id: str, search: Optional[str] = None
) -> List[CustomerResponse]:
    query = db.query(Customer).filter(
        Customer.tenant_id == tenant_id,
        Customer.is_active == True
    )
    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(Customer.name.ilike(s), Customer.email.ilike(s), Customer.phone.ilike(s))
        )

    customers = query.order_by(Customer.name.asc()).all()
    return [CustomerResponse.model_validate(c) for c in customers]

def get_customer_detail(
    db: Session, tenant_id: str, customer_id: str
) -> Dict[str, Any]:
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.tenant_id == tenant_id
    ).first()
    if not customer:
        raise NotFoundException("Customer not found")

    sales = db.query(Sale).filter(
        Sale.customer_id == customer_id,
        Sale.tenant_id == tenant_id,
        Sale.status == "COMPLETED"
    ).order_by(Sale.created_at.desc()).limit(10).all()

    sales_res = []
    for s in sales:
        s_res = SaleResponse.model_validate(s)
        s_res.items = [SaleItemResponse.model_validate(i) for i in s.items]
        sales_res.append(s_res)

    res = CustomerResponse.model_validate(customer)
    return {
        "customer": res,
        "recent_purchases": sales_res
    }

def update_customer(
    db: Session, tenant_id: str, customer_id: str, req: CustomerUpdate
) -> CustomerResponse:
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.tenant_id == tenant_id
    ).first()
    if not customer:
        raise NotFoundException("Customer not found")

    if req.name is not None:
        customer.name = req.name
    if req.email is not None:
        customer.email = req.email
    if req.phone is not None:
        customer.phone = req.phone
    if req.is_active is not None:
        customer.is_active = req.is_active

    db.commit()
    db.refresh(customer)
    return CustomerResponse.model_validate(customer)
