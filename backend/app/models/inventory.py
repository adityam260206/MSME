from sqlalchemy import (
    Column, String, Text, DateTime, Integer, ForeignKey, CheckConstraint, Index
)
from sqlalchemy.orm import relationship
from backend.app.db.base import Base
from backend.app.models.tenant import generate_uuid, utc_now

class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True)
    movement_type = Column(String(50), nullable=False)
    quantity = Column(Integer, nullable=False)  # signed delta
    previous_stock = Column(Integer, nullable=False)
    new_stock = Column(Integer, nullable=False)
    reason = Column(Text, nullable=False)
    actor_id = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    reference_id = Column(String(100), nullable=True, index=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)

    tenant = relationship("Tenant", back_populates="stock_movements")
    product = relationship("Product", back_populates="stock_movements")
    actor = relationship("User")

    __table_args__ = (
        CheckConstraint(
            "movement_type IN ('PURCHASE', 'SALE', 'ADJUSTMENT', 'RETURN')",
            name="chk_stock_movement_type_valid"
        ),
        CheckConstraint("new_stock >= 0", name="chk_stock_movement_new_stock_non_negative"),
        Index("ix_movements_tenant_created", "tenant_id", "created_at"),
        Index("ix_movements_product_created", "product_id", "created_at"),
    )
