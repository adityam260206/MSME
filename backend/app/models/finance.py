from sqlalchemy import (
    Column, String, Text, Boolean, DateTime, Numeric,
    ForeignKey, CheckConstraint, Index
)
from sqlalchemy.orm import relationship
from backend.app.db.base import Base
from backend.app.models.tenant import generate_uuid, utc_now

class FinancialTransaction(Base):
    __tablename__ = "financial_transactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(50), nullable=False)  # 'INCOME', 'EXPENSE'
    category = Column(String(100), nullable=False)  # 'SALES', 'PURCHASES', 'PAYROLL', 'UTILITIES', etc.
    amount = Column(Numeric(12, 2), nullable=False)
    reference_id = Column(String(100), nullable=True, index=True)
    description = Column(Text, nullable=False)
    actor_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_reversed = Column(Boolean, nullable=False, default=False)
    reversed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)

    tenant = relationship("Tenant", back_populates="financial_transactions")
    actor = relationship("User")

    __table_args__ = (
        CheckConstraint("type IN ('INCOME', 'EXPENSE')", name="chk_finance_type_valid"),
        CheckConstraint("amount > 0", name="chk_finance_amount_positive"),
        Index("ix_finance_tenant_created", "tenant_id", "created_at"),
        Index("ix_finance_tenant_type", "tenant_id", "type"),
        Index("ix_finance_tenant_category", "tenant_id", "category"),
    )
