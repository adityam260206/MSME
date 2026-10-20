from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.core.deps import require_roles
from backend.app.models.user import User
from backend.app.schemas.employee import (
    EmployeeCreate, EmployeeUpdate, EmployeeResponse
)
from backend.app.schemas.common import BaseResponse
from backend.app.services.employee_service import (
    create_employee, list_employees, update_employee, deactivate_employee
)

router = APIRouter(prefix="/business/employees", tags=["Workforce & HR"])

@router.get("", response_model=BaseResponse[List[EmployeeResponse]])
def get_employees(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "OWNER", "MANAGER")),  # STAFF denied with 403
):
    employees = list_employees(db, current_user.tenant_id, caller_role=current_user.role)
    return BaseResponse(
        success=True,
        message="Employee directory retrieved",
        data=employees,
    )

@router.post("", response_model=BaseResponse[EmployeeResponse])
def add_employee(
    req: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "OWNER")),  # ADMIN/OWNER only
):
    employee = create_employee(db, current_user.tenant_id, req)
    return BaseResponse(
        success=True,
        message="Employee record created successfully",
        data=employee,
    )

@router.put("/{employee_id}", response_model=BaseResponse[EmployeeResponse])
def edit_employee(
    employee_id: str,
    req: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "OWNER")),
):
    employee = update_employee(db, current_user.tenant_id, employee_id, req)
    return BaseResponse(
        success=True,
        message="Employee updated successfully",
        data=employee,
    )

@router.post("/{employee_id}/deactivate", response_model=BaseResponse[EmployeeResponse])
def deactivate_existing_employee(
    employee_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "OWNER")),
):
    employee = deactivate_employee(db, current_user.tenant_id, employee_id)
    return BaseResponse(
        success=True,
        message="Employee deactivated successfully",
        data=employee,
    )
