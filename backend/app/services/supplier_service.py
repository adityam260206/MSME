from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from backend.app.core.errors import NotFoundException
from backend.app.models.supplier import Supplier
from backend.app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierResponse

def create_supplier(db: Session, tenant_id: str, req: SupplierCreate) -> SupplierResponse:
    supplier = Supplier(
        tenant_id=tenant_id,
        name=req.name,
        contact_name=req.contact_name,
        email=req.email,
        phone=req.phone,
        address=req.address,
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return SupplierResponse.model_validate(supplier)

def list_suppliers(
    db: Session, tenant_id: str, search: Optional[str] = None
) -> List[SupplierResponse]:
    query = db.query(Supplier).filter(
        Supplier.tenant_id == tenant_id,
        Supplier.is_active == True
    )
    if search:
        s = f"%{search}%"
        query = query.filter(Supplier.name.ilike(s))

    suppliers = query.order_by(Supplier.name.asc()).all()
    return [SupplierResponse.model_validate(s) for s in suppliers]

def update_supplier(
    db: Session, tenant_id: str, supplier_id: str, req: SupplierUpdate
) -> SupplierResponse:
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id,
        Supplier.tenant_id == tenant_id
    ).first()
    if not supplier:
        raise NotFoundException("Supplier not found")

    if req.name is not None:
        supplier.name = req.name
    if req.contact_name is not None:
        supplier.contact_name = req.contact_name
    if req.email is not None:
        supplier.email = req.email
    if req.phone is not None:
        supplier.phone = req.phone
    if req.address is not None:
        supplier.address = req.address
    if req.is_active is not None:
        supplier.is_active = req.is_active

    db.commit()
    db.refresh(supplier)
    return SupplierResponse.model_validate(supplier)
