import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.db.base import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class BusinessGoal(Base):
    __tablename__ = "business_goals"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    target_month = Column(String(7), nullable=False)  # Format: "YYYY-MM"
    target_revenue = Column(Numeric(12, 2), nullable=False, default=0.00)
    target_sales_volume = Column(Integer, nullable=False, default=0)
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)
    updated_at = Column(DateTime, nullable=False, default=utc_now, onupdate=utc_now)

    __table_args__ = (
        UniqueConstraint("tenant_id", "target_month", name="uq_tenant_goal_month"),
    )

    tenant = relationship("Tenant", back_populates="goals")
