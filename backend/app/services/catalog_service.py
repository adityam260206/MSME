from typing import List, Optional, Tuple
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import or_
from backend.app.core.errors import (
    AppException, DuplicateSKUException, NotFoundException
)
from backend.app.models.catalog import Category, Product
from backend.app.models.inventory import StockMovement
from backend.app.schemas.catalog import (
    CategoryCreate, CategoryUpdate, CategoryResponse,
    ProductCreate, ProductUpdate, ProductResponse,
)

def compute_stock_status(quantity: int, min_stock: int) -> str:
    if quantity <= 0:
        return "OUT_OF_STOCK"
    elif quantity <= min_stock:
        return "LOW_STOCK"
    return "IN_STOCK"

# ── Category Services ────────────────────────────────────────────────────────

def create_category(db: Session, tenant_id: str, req: CategoryCreate) -> CategoryResponse:
    existing = db.query(Category).filter(
        Category.tenant_id == tenant_id,
        Category.name == req.name
    ).first()
    if existing:
        raise AppException(400, f"Category '{req.name}' already exists", "DUPLICATE_CATEGORY")

    parent_id = req.parent_id if req.parent_id else None
    if parent_id:
        parent = db.query(Category).filter(
            Category.id == parent_id,
            Category.tenant_id == tenant_id
        ).first()
        if not parent:
            raise NotFoundException("Parent category not found")

    category = Category(
        tenant_id=tenant_id,
        name=req.name,
        description=req.description,
        parent_id=parent_id,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return CategoryResponse.model_validate(category)

def list_categories(db: Session, tenant_id: str) -> List[CategoryResponse]:
    categories = db.query(Category).filter(
        Category.tenant_id == tenant_id,
        Category.is_active == True
    ).order_by(Category.name.asc()).all()
    return [CategoryResponse.model_validate(c) for c in categories]

def update_category(db: Session, tenant_id: str, category_id: str, req: CategoryUpdate) -> CategoryResponse:
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.tenant_id == tenant_id
    ).first()
    if not category:
        raise NotFoundException("Category not found")

    if req.name is not None and req.name != category.name:
        existing = db.query(Category).filter(
            Category.tenant_id == tenant_id,
            Category.name == req.name,
            Category.id != category_id
        ).first()
        if existing:
            raise AppException(400, f"Category '{req.name}' already exists", "DUPLICATE_CATEGORY")
        category.name = req.name

    if req.parent_id is not None:
        if req.parent_id == category.id:
            raise AppException(400, "Category cannot be its own parent", "INVALID_PARENT")
        parent = db.query(Category).filter(
            Category.id == req.parent_id,
            Category.tenant_id == tenant_id
        ).first()
        if not parent:
            raise NotFoundException("Parent category not found")
        category.parent_id = req.parent_id

    if req.description is not None:
        category.description = req.description
    if req.is_active is not None:
        category.is_active = req.is_active

    db.commit()
    db.refresh(category)
    return CategoryResponse.model_validate(category)

# ── Product Services ─────────────────────────────────────────────────────────

def create_product(
    db: Session, tenant_id: str, actor_id: str, req: ProductCreate
) -> ProductResponse:
    # Check SKU uniqueness
    existing_sku = db.query(Product).filter(Product.sku == req.sku).first()
    if existing_sku:
        raise DuplicateSKUException()

    # Validate category
    category = db.query(Category).filter(
        Category.id == req.category_id,
        Category.tenant_id == tenant_id
    ).first()
    if not category:
        raise NotFoundException("Category not found")

    product = Product(
        tenant_id=tenant_id,
        category_id=req.category_id,
        name=req.name,
        sku=req.sku,
        cost_price=req.cost_price,
        selling_price=req.selling_price,
        stock_quantity=req.stock_quantity,
        min_stock_level=req.min_stock_level,
        lead_time_days=req.lead_time_days,
        safety_stock=req.safety_stock,
    )
    db.add(product)
    db.flush()

    # Record initial stock movement if opening stock > 0
    if req.stock_quantity > 0:
        movement = StockMovement(
            tenant_id=tenant_id,
            product_id=product.id,
            movement_type="ADJUSTMENT",
            quantity=req.stock_quantity,
            previous_stock=0,
            new_stock=req.stock_quantity,
            reason="Opening stock balance upon product creation",
            actor_id=actor_id,
            reference_id=f"INITIAL-{product.sku}",
        )
        db.add(movement)

    db.commit()
    db.refresh(product)

    res = ProductResponse.model_validate(product)
    res.category_name = category.name
    res.stock_status = compute_stock_status(product.stock_quantity, product.min_stock_level)
    return res

def get_product(
    db: Session, tenant_id: str, product_id: str, role: str
) -> ProductResponse:
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.tenant_id == tenant_id
    ).first()
    if not product:
        raise NotFoundException("Product not found")

    res = ProductResponse.model_validate(product)
    res.category_name = product.category.name if product.category else None
    res.stock_status = compute_stock_status(product.stock_quantity, product.min_stock_level)

    # Protect cost price from STAFF
    if role == "STAFF":
        res.cost_price = None

    return res

def list_products(
    db: Session,
    tenant_id: str,
    role: str,
    search: Optional[str] = None,
    category_id: Optional[str] = None,
    stock_status: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
) -> Tuple[List[ProductResponse], int]:
    query = db.query(Product).filter(
        Product.tenant_id == tenant_id,
        Product.is_active == True
    )

    if category_id:
        query = query.filter(Product.category_id == category_id)

    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(Product.name.ilike(s), Product.sku.ilike(s))
        )

    total = query.count()
    products = query.order_by(Product.name.asc()).offset((page - 1) * limit).limit(limit).all()

    result = []
    for p in products:
        status = compute_stock_status(p.stock_quantity, p.min_stock_level)
        if stock_status and status != stock_status:
            continue
        res = ProductResponse.model_validate(p)
        res.category_name = p.category.name if p.category else None
        res.stock_status = status
        if role == "STAFF":
            res.cost_price = None
        result.append(res)

    return result, total

def update_product(
    db: Session, tenant_id: str, product_id: str, req: ProductUpdate
) -> ProductResponse:
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.tenant_id == tenant_id
    ).first()
    if not product:
        raise NotFoundException("Product not found")

    if req.category_id is not None:
        category = db.query(Category).filter(
            Category.id == req.category_id,
            Category.tenant_id == tenant_id
        ).first()
        if not category:
            raise NotFoundException("Category not found")
        product.category_id = req.category_id

    if req.name is not None:
        product.name = req.name
    if req.cost_price is not None:
        product.cost_price = req.cost_price
    if req.selling_price is not None:
        product.selling_price = req.selling_price
    if req.min_stock_level is not None:
        product.min_stock_level = req.min_stock_level
    if req.lead_time_days is not None:
        product.lead_time_days = req.lead_time_days
    if req.safety_stock is not None:
        product.safety_stock = req.safety_stock
    if req.is_active is not None:
        product.is_active = req.is_active

    db.commit()
    db.refresh(product)

    res = ProductResponse.model_validate(product)
    res.category_name = product.category.name if product.category else None
    res.stock_status = compute_stock_status(product.stock_quantity, product.min_stock_level)
    return res

def delete_product(db: Session, tenant_id: str, product_id: str) -> None:
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.tenant_id == tenant_id
    ).first()
    if not product:
        raise NotFoundException("Product not found")
    product.is_active = False
    db.commit()
