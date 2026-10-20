from sqlalchemy import (
    Column, String, DateTime, Integer, Numeric,
    ForeignKey, CheckConstraint, Index
)
from sqlalchemy.orm import relationship
from backend.app.db.base import Base
from backend.app.models.tenant import generate_uuid, utc_now

class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    supplier_id = Column(String(36), ForeignKey("suppliers.id", ondelete="RESTRICT"), nullable=False, index=True)
    purchase_number = Column(String(50), nullable=False, index=True)
    status = Column(String(50), nullable=False, default="COMPLETED")
    subtotal = Column(Numeric(12, 2), nullable=False)
    tax_rate = Column(Numeric(5, 2), nullable=False, default=0.00)
    tax_amount = Column(Numeric(12, 2), nullable=False, default=0.00)
    discount_amount = Column(Numeric(12, 2), nullable=False, default=0.00)
    total_amount = Column(Numeric(12, 2), nullable=False)
    payment_method = Column(String(50), nullable=False, default="CASH")
    payment_status = Column(String(50), nullable=False, default="PAID")
    reference_grn = Column(String(100), nullable=False)
    actor_id = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=utc_now)
    cancelled_at = Column(DateTime, nullable=True)

    tenant = relationship("Tenant", back_populates="purchases")
    supplier = relationship("Supplier", back_populates="purchases")
    actor = relationship("User")
    items = relationship("PurchaseItem", back_populates="purchase", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("status IN ('COMPLETED', 'CANCELLED')", name="chk_purchase_status_valid"),
        CheckConstraint("subtotal >= 0", name="chk_purchase_subtotal_non_negative"),
        CheckConstraint("tax_rate >= 0", name="chk_purchase_tax_rate_non_negative"),
        CheckConstraint("tax_amount >= 0", name="chk_purchase_tax_amount_non_negative"),
        CheckConstraint("discount_amount >= 0", name="chk_purchase_discount_non_negative"),
        CheckConstraint("total_amount >= 0", name="chk_purchase_total_non_negative"),
        Index("ix_purchases_tenant_created", "tenant_id", "created_at"),
    )

class PurchaseItem(Base):
    __tablename__ = "purchase_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    purchase_id = Column(String(36), ForeignKey("purchases.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True)
    product_name = Column(String(255), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_cost = Column(Numeric(12, 2), nullable=False)
    line_total = Column(Numeric(12, 2), nullable=False)

    purchase = relationship("Purchase", back_populates="items")
    product = relationship("Product", back_populates="purchase_items")

    __table_args__ = (
        CheckConstraint("quantity > 0", name="chk_purchase_item_quantity_positive"),
        CheckConstraint("unit_cost > 0", name="chk_purchase_item_unit_cost_positive"),
        CheckConstraint("line_total > 0", name="chk_purchase_item_line_total_positive"),
    )
