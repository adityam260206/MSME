from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.core.errors import NotFoundException
from backend.app.models.catalog import Product
from backend.app.models.alert import Alert
from backend.app.schemas.alert import AlertResponse

def evaluate_and_get_alerts(
    db: Session, tenant_id: str, is_read: Optional[bool] = None
) -> List[AlertResponse]:
    # Check all active products for stock threshold violations
    products = db.query(Product).filter(
        Product.tenant_id == tenant_id,
        Product.is_active == True
    ).all()

    for p in products:
        if p.stock_quantity <= 0:
            existing = db.query(Alert).filter(
                Alert.tenant_id == tenant_id,
                Alert.product_id == p.id,
                Alert.alert_type == "OUT_OF_STOCK",
                Alert.is_read == False,
            ).first()
            if not existing:
                alert = Alert(
                    tenant_id=tenant_id,
                    product_id=p.id,
                    alert_type="OUT_OF_STOCK",
                    severity="CRITICAL",
                    title=f"Out of Stock: {p.name}",
                    message=f"Product '{p.name}' (SKU: {p.sku}) is completely out of stock.",
                )
                db.add(alert)
        elif p.stock_quantity <= p.min_stock_level:
            existing = db.query(Alert).filter(
                Alert.tenant_id == tenant_id,
                Alert.product_id == p.id,
                Alert.alert_type == "LOW_STOCK",
                Alert.is_read == False,
            ).first()
            if not existing:
                alert = Alert(
                    tenant_id=tenant_id,
                    product_id=p.id,
                    alert_type="LOW_STOCK",
                    severity="WARNING",
                    title=f"Low Stock: {p.name}",
                    message=f"Product '{p.name}' (SKU: {p.sku}) has {p.stock_quantity} units remaining (threshold: {p.min_stock_level}).",
                )
                db.add(alert)

    db.commit()

    query = db.query(Alert).filter(Alert.tenant_id == tenant_id)
    if is_read is not None:
        query = query.filter(Alert.is_read == is_read)

    alerts = query.order_by(desc(Alert.created_at)).limit(50).all()

    result = []
    for a in alerts:
        res = AlertResponse.model_validate(a)
        res.product_name = a.product.name if a.product else None
        result.append(res)

    return result

def mark_alert_read(
    db: Session, tenant_id: str, alert_id: str
) -> AlertResponse:
    alert = db.query(Alert).filter(
        Alert.id == alert_id,
        Alert.tenant_id == tenant_id
    ).first()
    if not alert:
        raise NotFoundException("Alert not found")

    alert.is_read = True
    db.commit()
    db.refresh(alert)

    res = AlertResponse.model_validate(alert)
    res.product_name = alert.product.name if alert.product else None
    return res
