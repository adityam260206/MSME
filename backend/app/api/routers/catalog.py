from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.core.deps import get_current_user, require_roles
from backend.app.models.user import User
from backend.app.schemas.catalog import (
    CategoryCreate, CategoryUpdate, CategoryResponse,
    ProductCreate, ProductUpdate, ProductResponse,
)
from backend.app.schemas.common import BaseResponse, PaginatedResponse, PaginatedMeta
from backend.app.services.catalog_service import (
    create_category, list_categories, update_category,
    create_product, get_product, list_products, update_product,
)

router = APIRouter(prefix="/inventory", tags=["Catalog & Categories"])

# ── Categories ───────────────────────────────────────────────────────────────

@router.get("/categories", response_model=BaseResponse[List[CategoryResponse]])
def get_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    categories = list_categories(db, current_user.tenant_id)
    return BaseResponse(
        success=True,
        message="Categories retrieved",
        data=categories,
    )

@router.post("/categories", response_model=BaseResponse[CategoryResponse])
def add_category(
    req: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "OWNER", "MANAGER")),
):
    cat = create_category(db, current_user.tenant_id, req)
    return BaseResponse(
        success=True,
        message="Category created successfully",
        data=cat,
    )

@router.put("/categories/{category_id}", response_model=BaseResponse[CategoryResponse])
def edit_category(
    category_id: str,
    req: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "OWNER", "MANAGER")),
):
    cat = update_category(db, current_user.tenant_id, category_id, req)
    return BaseResponse(
        success=True,
        message="Category updated successfully",
        data=cat,
    )

# ── Products ────────────────────────────────────────────────────────────────

@router.get("/products", response_model=PaginatedResponse[ProductResponse])
def get_products(
    search: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    stock_status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    products, total = list_products(
        db,
        current_user.tenant_id,
        current_user.role,
        search=search,
        category_id=category_id,
        stock_status=stock_status,
        page=page,
        limit=limit,
    )
    total_pages = (total + limit - 1) // limit if total > 0 else 1
    return PaginatedResponse(
        success=True,
        message="Products retrieved",
        data=products,
        meta=PaginatedMeta(total=total, page=page, limit=limit, total_pages=total_pages),
    )

@router.get("/products/{product_id}", response_model=BaseResponse[ProductResponse])
def get_product_by_id(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prod = get_product(db, current_user.tenant_id, product_id, current_user.role)
    return BaseResponse(
        success=True,
        message="Product details retrieved",
        data=prod,
    )

@router.post("/products", response_model=BaseResponse[ProductResponse])
def add_product(
    req: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "OWNER", "MANAGER")),
):
    prod = create_product(db, current_user.tenant_id, current_user.id, req)
    return BaseResponse(
        success=True,
        message="Product created successfully",
        data=prod,
    )

@router.put("/products/{product_id}", response_model=BaseResponse[ProductResponse])
def edit_product(
    product_id: str,
    req: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "OWNER", "MANAGER")),
):
    prod = update_product(db, current_user.tenant_id, product_id, req)
    return BaseResponse(
        success=True,
        message="Product updated successfully",
        data=prod,
    )
