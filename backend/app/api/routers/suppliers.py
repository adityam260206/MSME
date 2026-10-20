from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.core.deps import get_current_user, require_roles
from backend.app.models.user import User
from backend.app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierResponse
from backend.app.schemas.common import BaseResponse
from backend.app.services.supplier_service import (
    create_supplier, list_suppliers, update_supplier
)

router = APIRouter(prefix="/business/suppliers", tags=["Suppliers"])

@router.get("", response_model=BaseResponse[List[SupplierResponse]])
def get_suppliers(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    suppliers = list_suppliers(db, current_user.tenant_id, search=search)
    return BaseResponse(
        success=True,
        message="Suppliers retrieved",
        data=suppliers,
    )

@router.post("", response_model=BaseResponse[SupplierResponse])
def add_supplier(
    req: SupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "OWNER", "MANAGER")),
):
    supplier = create_supplier(db, current_user.tenant_id, req)
    return BaseResponse(
        success=True,
        message="Supplier created successfully",
        data=supplier,
    )

@router.put("/{supplier_id}", response_model=BaseResponse[SupplierResponse])
def edit_supplier(
    supplier_id: str,
    req: SupplierUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "OWNER", "MANAGER")),
):
    supplier = update_supplier(db, current_user.tenant_id, supplier_id, req)
    return BaseResponse(
        success=True,
        message="Supplier updated successfully",
        data=supplier,
    )
