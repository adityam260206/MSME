from typing import List, Optional
from decimal import Decimal
from sqlalchemy.orm import Session
from backend.app.core.errors import NotFoundException
from backend.app.models.employee import Employee
from backend.app.schemas.employee import (
    EmployeeCreate, EmployeeUpdate, EmployeeResponse
)

def create_employee(
    db: Session, tenant_id: str, req: EmployeeCreate
) -> EmployeeResponse:
    employee = Employee(
        tenant_id=tenant_id,
        name=req.name,
        email=req.email,
        role=req.role,
        department=req.department,
        monthly_base_salary=req.monthly_base_salary,
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return EmployeeResponse.model_validate(employee)

def list_employees(
    db: Session, tenant_id: str, caller_role: str
) -> List[EmployeeResponse]:
    employees = db.query(Employee).filter(
        Employee.tenant_id == tenant_id,
        Employee.is_active == True
    ).order_by(Employee.name.asc()).all()

    result = []
    for emp in employees:
        res = EmployeeResponse.model_validate(emp)
        # Protect salary field from MANAGER role
        if caller_role == "MANAGER":
            res.monthly_base_salary = None
        result.append(res)

    return result

def update_employee(
    db: Session, tenant_id: str, employee_id: str, req: EmployeeUpdate
) -> EmployeeResponse:
    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.tenant_id == tenant_id
    ).first()
    if not employee:
        raise NotFoundException("Employee not found")

    if req.name is not None:
        employee.name = req.name
    if req.email is not None:
        employee.email = req.email
    if req.role is not None:
        employee.role = req.role
    if req.department is not None:
        employee.department = req.department
    if req.monthly_base_salary is not None:
        employee.monthly_base_salary = req.monthly_base_salary
    if req.is_active is not None:
        employee.is_active = req.is_active

    db.commit()
    db.refresh(employee)
    return EmployeeResponse.model_validate(employee)

def deactivate_employee(
    db: Session, tenant_id: str, employee_id: str
) -> EmployeeResponse:
    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.tenant_id == tenant_id
    ).first()
    if not employee:
        raise NotFoundException("Employee not found")

    employee.is_active = False
    db.commit()
    db.refresh(employee)
    return EmployeeResponse.model_validate(employee)
