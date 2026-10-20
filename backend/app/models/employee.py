from sqlalchemy import Column, String, Boolean, DateTime, Numeric, ForeignKey, CheckConstraint, Index
from sqlalchemy.orm import relationship
from backend.app.db.base import Base
from backend.app.models.tenant import generate_uuid, utc_now

class Employee(Base):
    __tablename__ = "employees"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    role = Column(String(100), nullable=False)  # job title / operational role
    department = Column(String(100), nullable=False)
    monthly_base_salary = Column(Numeric(12, 2), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)
    updated_at = Column(DateTime, nullable=False, default=utc_now, onupdate=utc_now)

    tenant = relationship("Tenant", back_populates="employees")

    __table_args__ = (
        CheckConstraint("monthly_base_salary > 0", name="chk_employee_salary_positive"),
        Index("ix_employees_tenant_created", "tenant_id", "created_at"),
        Index("ix_employees_tenant_dept", "tenant_id", "department"),
    )
