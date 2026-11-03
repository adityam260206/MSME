from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey, CheckConstraint, Index
from sqlalchemy.orm import relationship
from backend.app.db.base import Base
from backend.app.models.tenant import generate_uuid, utc_now

class CustomerFeedback(Base):
    __tablename__ = "customer_feedback"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    sale_id = Column(String(36), ForeignKey("sales.id", ondelete="CASCADE"), nullable=True, unique=True, index=True)
    rating = Column(Integer, nullable=False)  # 1 to 5
    comment = Column(Text, nullable=True)
    submitted_by_role = Column(String(50), nullable=False, default="CUSTOMER")  # CUSTOMER or STAFF_ON_BEHALF
    created_at = Column(DateTime, nullable=False, default=utc_now, index=True)

    tenant = relationship("Tenant")
    customer = relationship("Customer")
    sale = relationship("Sale")

    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="chk_customer_feedback_rating_range"),
        Index("ix_customer_feedback_tenant_customer", "tenant_id", "customer_id"),
    )
