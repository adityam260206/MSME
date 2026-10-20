from typing import List, Optional, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.core.errors import (
    AppException, InsufficientStockException, NotFoundException
)
from backend.app.models.catalog import Product
from backend.app.models.inventory import StockMovement
from backend.app.models.alert import Alert
from backend.app.schemas.inventory import StockAdjustRequest, StockMovementResponse

def adjust_product_stock(
    db: Session,
    tenant_id: str,
    product_id: str,
    actor_id: str,
    req: StockAdjustRequest,
) -> StockMovementResponse:
    # Row-lock product
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.tenant_id == tenant_id
    ).with_for_update().first()

    if not product:
        raise NotFoundException("Product not found")

    previous_stock = product.stock_quantity
    new_stock = previous_stock + req.quantity_delta

    if new_stock < 0:
        raise InsufficientStockException(
            message=f"Cannot reduce stock by {abs(req.quantity_delta)}; only {previous_stock} available",
            details={"requested_delta": req.quantity_delta, "available_stock": previous_stock}
        )

    product.stock_quantity = new_stock

    movement = StockMovement(
        tenant_id=tenant_id,
        product_id=product.id,
        movement_type=req.movement_type,
        quantity=req.quantity_delta,
        previous_stock=previous_stock,
        new_stock=new_stock,
        reason=req.reason,
        actor_id=actor_id,
        reference_id=f"ADJ-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
    )
    db.add(movement)

    # Check alert conditions
    if new_stock <= 0:
        alert = Alert(
            tenant_id=tenant_id,
            product_id=product.id,
            alert_type="OUT_OF_STOCK",
            severity="CRITICAL",
            title=f"Out of Stock: {product.name}",
            message=f"Product '{product.name}' (SKU: {product.sku}) is completely out of stock.",
        )
        db.add(alert)
    elif new_stock <= product.min_stock_level:
        alert = Alert(
            tenant_id=tenant_id,
            product_id=product.id,
            alert_type="LOW_STOCK",
            severity="WARNING",
            title=f"Low Stock: {product.name}",
            message=f"Product '{product.name}' (SKU: {product.sku}) stock ({new_stock}) is at or below threshold ({product.min_stock_level}).",
        )
        db.add(alert)

    db.commit()
    db.refresh(movement)

    res = StockMovementResponse.model_validate(movement)
    res.product_name = product.name
    res.actor_name = movement.actor.full_name if movement.actor else None
    return res

def list_stock_movements(
    db: Session,
    tenant_id: str,
    product_id: Optional[str] = None,
    movement_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
) -> Tuple[List[StockMovementResponse], int]:
    query = db.query(StockMovement).filter(StockMovement.tenant_id == tenant_id)

    if product_id:
        query = query.filter(StockMovement.product_id == product_id)

    if movement_type:
        query = query.filter(StockMovement.movement_type == movement_type)

    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(StockMovement.created_at >= start_dt)
        except ValueError:
            pass

    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            query = query.filter(StockMovement.created_at <= end_dt)
        except ValueError:
            pass

    total = query.count()
    movements = query.order_by(desc(StockMovement.created_at)).offset((page - 1) * limit).limit(limit).all()

    result = []
    for m in movements:
        res = StockMovementResponse.model_validate(m)
        res.product_name = m.product.name if m.product else None
        res.actor_name = m.actor.full_name if m.actor else None
        result.append(res)

    return result, total
