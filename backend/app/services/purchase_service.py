import uuid
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.core.errors import (
    AppException, EmptyItemsException, AlreadyCancelledException, NotFoundException
)
from backend.app.models.supplier import Supplier
from backend.app.models.catalog import Product
from backend.app.models.purchase import Purchase, PurchaseItem
from backend.app.models.inventory import StockMovement
from backend.app.models.finance import FinancialTransaction
from backend.app.schemas.purchase import (
    PurchaseCreate, PurchaseResponse, PurchaseItemResponse
)

def round_money(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def create_purchase(
    db: Session, tenant_id: str, actor_id: str, req: PurchaseCreate
) -> PurchaseResponse:
    if not req.items or len(req.items) == 0:
        raise EmptyItemsException()

    supplier = db.query(Supplier).filter(
        Supplier.id == req.supplier_id,
        Supplier.tenant_id == tenant_id
    ).first()
    if not supplier:
        raise NotFoundException("Supplier not found")

    # Start atomic transaction
    try:
        now_str = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        short_id = uuid.uuid4().hex[:6].upper()
        purchase_num = f"PO-{now_str[:8]}-{short_id}"
        grn_ref = f"GRN-{now_str[:8]}-{short_id}"

        subtotal = Decimal("0.00")
        validated_items = []

        for it in req.items:
            product = db.query(Product).filter(
                Product.id == it.product_id,
                Product.tenant_id == tenant_id
            ).with_for_update().first()
            if not product:
                raise NotFoundException(f"Product '{it.product_id}' not found")

            line_tot = round_money(Decimal(str(it.quantity)) * it.unit_cost)
            subtotal += line_tot
            validated_items.append((product, it.quantity, it.unit_cost, line_tot))

        tax_amount = round_money(subtotal * (req.tax_rate / Decimal("100.0")))
        discount_amount = round_money(req.discount_amount)
        total_amount = round_money(subtotal + tax_amount - discount_amount)
        if total_amount < Decimal("0.00"):
            total_amount = Decimal("0.00")

        purchase = Purchase(
            tenant_id=tenant_id,
            supplier_id=supplier.id,
            purchase_number=purchase_num,
            status="COMPLETED",
            subtotal=subtotal,
            tax_rate=req.tax_rate,
            tax_amount=tax_amount,
            discount_amount=discount_amount,
            total_amount=total_amount,
            payment_method=req.payment_method,
            payment_status="PAID",
            reference_grn=grn_ref,
            actor_id=actor_id,
        )
        db.add(purchase)
        db.flush()

        # Add purchase items and update stock
        for product, qty, cost, line_tot in validated_items:
            item_record = PurchaseItem(
                purchase_id=purchase.id,
                product_id=product.id,
                product_name=product.name,
                quantity=qty,
                unit_cost=cost,
                line_total=line_tot,
            )
            db.add(item_record)

            prev_stock = product.stock_quantity
            new_stock = prev_stock + qty
            product.stock_quantity = new_stock

            movement = StockMovement(
                tenant_id=tenant_id,
                product_id=product.id,
                movement_type="PURCHASE",
                quantity=qty,
                previous_stock=prev_stock,
                new_stock=new_stock,
                reason=f"Purchase order {purchase_num} received (GRN: {grn_ref})",
                actor_id=actor_id,
                reference_id=purchase.id,
            )
            db.add(movement)

        # Post linked EXPENSE entry in financial ledger
        expense_entry = FinancialTransaction(
            tenant_id=tenant_id,
            type="EXPENSE",
            category="PURCHASES",
            amount=total_amount,
            reference_id=purchase.id,
            description=f"Purchase Order {purchase_num} - {supplier.name}",
            actor_id=actor_id,
        )
        db.add(expense_entry)

        db.commit()
        db.refresh(purchase)

    except Exception:
        db.rollback()
        raise

    res = PurchaseResponse.model_validate(purchase)
    res.supplier_name = supplier.name
    res.items = [
        PurchaseItemResponse.model_validate(item) for item in purchase.items
    ]
    return res

def cancel_purchase(
    db: Session, tenant_id: str, purchase_id: str, actor_id: str
) -> PurchaseResponse:
    purchase = db.query(Purchase).filter(
        Purchase.id == purchase_id,
        Purchase.tenant_id == tenant_id
    ).with_for_update().first()

    if not purchase:
        raise NotFoundException("Purchase order not found")

    if purchase.status == "CANCELLED":
        raise AlreadyCancelledException("Purchase order is already cancelled")

    try:
        # Reverse stock increment
        for item in purchase.items:
            product = db.query(Product).filter(
                Product.id == item.product_id,
                Product.tenant_id == tenant_id
            ).with_for_update().first()
            if product:
                prev_stock = product.stock_quantity
                new_stock = prev_stock - item.quantity
                if new_stock < 0:
                    raise AppException(
                        400,
                        f"Cannot cancel purchase: reversing would reduce stock for '{product.name}' below 0 (current: {prev_stock}, required: {item.quantity})",
                        "INVALID_REVERSAL"
                    )
                product.stock_quantity = new_stock

                movement = StockMovement(
                    tenant_id=tenant_id,
                    product_id=product.id,
                    movement_type="ADJUSTMENT",
                    quantity=-item.quantity,
                    previous_stock=prev_stock,
                    new_stock=new_stock,
                    reason=f"Cancelled purchase order {purchase.purchase_number}",
                    actor_id=actor_id,
                    reference_id=purchase.id,
                )
                db.add(movement)

        purchase.status = "CANCELLED"
        purchase.cancelled_at = datetime.now(timezone.utc)

        # Reverse linked finance transaction
        ft = db.query(FinancialTransaction).filter(
            FinancialTransaction.reference_id == purchase.id,
            FinancialTransaction.tenant_id == tenant_id,
            FinancialTransaction.is_reversed == False
        ).first()
        if ft:
            ft.is_reversed = True
            ft.reversed_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(purchase)

    except Exception:
        db.rollback()
        raise

    res = PurchaseResponse.model_validate(purchase)
    res.supplier_name = purchase.supplier.name if purchase.supplier else None
    res.items = [
        PurchaseItemResponse.model_validate(item) for item in purchase.items
    ]
    return res

def list_purchases(
    db: Session,
    tenant_id: str,
    page: int = 1,
    limit: int = 20,
) -> Tuple[List[PurchaseResponse], int]:
    query = db.query(Purchase).filter(Purchase.tenant_id == tenant_id)
    total = query.count()
    purchases = query.order_by(desc(Purchase.created_at)).offset((page - 1) * limit).limit(limit).all()

    result = []
    for p in purchases:
        res = PurchaseResponse.model_validate(p)
        res.supplier_name = p.supplier.name if p.supplier else None
        res.items = [PurchaseItemResponse.model_validate(i) for i in p.items]
        result.append(res)

    return result, total
