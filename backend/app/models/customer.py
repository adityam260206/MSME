from sqlalchemy import Column, String, Boolean, DateTime, Numeric, ForeignKey, CheckConstraint, Index
from sqlalchemy.orm import relationship
from backend.app.db.base import Base
from backend.app.models.tenant import generate_uuid, utc_now

class Customer(Base):
    __tablename__ = "customers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    total_spent = Column(Numeric(12, 2), nullable=False, default=0.00)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)
    updated_at = Column(DateTime, nullable=False, default=utc_now, onupdate=utc_now)

    tenant = relationship("Tenant", back_populates="customers")
    sales = relationship("Sale", back_populates="customer")

    __table_args__ = (
        CheckConstraint("total_spent >= 0", name="chk_customer_total_spent_non_negative"),
        Index("ix_customers_tenant_created", "tenant_id", "created_at"),
        Index("ix_customers_tenant_name", "tenant_id", "name"),
    )
