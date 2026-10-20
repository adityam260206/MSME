from sqlalchemy import (
    Column, String, Text, Boolean, DateTime, Integer, Numeric,
    ForeignKey, UniqueConstraint, CheckConstraint, Index
)
from sqlalchemy.orm import relationship
from backend.app.db.base import Base
from backend.app.models.tenant import generate_uuid, utc_now

class Category(Base):
    __tablename__ = "categories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    parent_id = Column(String(36), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)
    updated_at = Column(DateTime, nullable=False, default=utc_now, onupdate=utc_now)

    tenant = relationship("Tenant", back_populates="categories")
    parent = relationship("Category", remote_side=[id], backref="subcategories")
    products = relationship("Product", back_populates="category")

    __table_args__ = (
        UniqueConstraint("tenant_id", "name", name="uq_categories_tenant_name"),
        Index("ix_categories_tenant_created", "tenant_id", "created_at"),
    )

class Product(Base):
    __tablename__ = "products"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(String(36), ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    sku = Column(String(100), unique=True, nullable=False, index=True)
    cost_price = Column(Numeric(12, 2), nullable=False)
    selling_price = Column(Numeric(12, 2), nullable=False)
    stock_quantity = Column(Integer, nullable=False, default=0)
    min_stock_level = Column(Integer, nullable=False, default=5)
    lead_time_days = Column(Integer, nullable=False, default=7)
    safety_stock = Column(Integer, nullable=False, default=10)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)
    updated_at = Column(DateTime, nullable=False, default=utc_now, onupdate=utc_now)

    tenant = relationship("Tenant", back_populates="products")
    category = relationship("Category", back_populates="products")
    stock_movements = relationship("StockMovement", back_populates="product")
    sale_items = relationship("SaleItem", back_populates="product")
    purchase_items = relationship("PurchaseItem", back_populates="product")

    __table_args__ = (
        CheckConstraint("cost_price > 0", name="chk_product_cost_price_positive"),
        CheckConstraint("selling_price > 0", name="chk_product_selling_price_positive"),
        CheckConstraint("stock_quantity >= 0", name="chk_product_stock_quantity_non_negative"),
        CheckConstraint("min_stock_level >= 0", name="chk_product_min_stock_non_negative"),
        CheckConstraint("lead_time_days > 0", name="chk_product_lead_time_positive"),
        CheckConstraint("safety_stock >= 0", name="chk_product_safety_stock_non_negative"),
        Index("ix_products_tenant_created", "tenant_id", "created_at"),
        Index("ix_products_tenant_category", "tenant_id", "category_id"),
    )
