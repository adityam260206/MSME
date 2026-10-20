from sqlalchemy import (
    Column, String, DateTime, Integer, Numeric,
    ForeignKey, CheckConstraint, Index
)
from sqlalchemy.orm import relationship
from backend.app.db.base import Base
from backend.app.models.tenant import generate_uuid, utc_now

class Sale(Base):
    __tablename__ = "sales"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True)
    customer_name = Column(String(255), nullable=False, default="Guest Customer")
    invoice_number = Column(String(50), nullable=False, index=True)
    status = Column(String(50), nullable=False, default="COMPLETED")
    subtotal = Column(Numeric(12, 2), nullable=False)
    tax_rate = Column(Numeric(5, 2), nullable=False, default=0.00)
    tax_amount = Column(Numeric(12, 2), nullable=False, default=0.00)
    discount_amount = Column(Numeric(12, 2), nullable=False, default=0.00)
    total_amount = Column(Numeric(12, 2), nullable=False)
    payment_method = Column(String(50), nullable=False, default="CASH")
    payment_status = Column(String(50), nullable=False, default="PAID")
    actor_id = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=utc_now)
    cancelled_at = Column(DateTime, nullable=True)

    tenant = relationship("Tenant", back_populates="sales")
    customer = relationship("Customer", back_populates="sales")
    actor = relationship("User")
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("status IN ('COMPLETED', 'CANCELLED')", name="chk_sale_status_valid"),
        CheckConstraint("subtotal >= 0", name="chk_sale_subtotal_non_negative"),
        CheckConstraint("tax_rate >= 0", name="chk_sale_tax_rate_non_negative"),
        CheckConstraint("tax_amount >= 0", name="chk_sale_tax_amount_non_negative"),
        CheckConstraint("discount_amount >= 0", name="chk_sale_discount_non_negative"),
        CheckConstraint("total_amount >= 0", name="chk_sale_total_non_negative"),
        Index("ix_sales_tenant_created", "tenant_id", "created_at"),
    )

class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    sale_id = Column(String(36), ForeignKey("sales.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True)
    product_name = Column(String(255), nullable=False)
    sku = Column(String(100), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    line_total = Column(Numeric(12, 2), nullable=False)

    sale = relationship("Sale", back_populates="items")
    product = relationship("Product", back_populates="sale_items")

    __table_args__ = (
        CheckConstraint("quantity > 0", name="chk_sale_item_quantity_positive"),
        CheckConstraint("unit_price > 0", name="chk_sale_item_unit_price_positive"),
        CheckConstraint("line_total > 0", name="chk_sale_item_line_total_positive"),
    )
