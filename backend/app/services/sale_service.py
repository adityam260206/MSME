import uuid
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.core.errors import (
    AppException, EmptyItemsException, InsufficientStockException,
    AlreadyCancelledException, NotFoundException
)
from backend.app.models.customer import Customer
from backend.app.models.catalog import Product
from backend.app.models.sale import Sale, SaleItem
from backend.app.models.inventory import StockMovement
from backend.app.models.finance import FinancialTransaction
from backend.app.models.alert import Alert
from backend.app.schemas.sale import (
    SaleCreate, SaleResponse, SaleItemResponse
)

def round_money(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def create_sale(
    db: Session, tenant_id: str, actor_id: str, req: SaleCreate
) -> SaleResponse:
    if not req.items or len(req.items) == 0:
        raise EmptyItemsException()

    customer = None
    customer_name = "Guest Customer"
    if req.customer_id:
        customer = db.query(Customer).filter(
            Customer.id == req.customer_id,
            Customer.tenant_id == tenant_id
        ).first()
        if not customer:
            raise NotFoundException("Customer not found")
        customer_name = customer.name
    elif req.customer_name:
        customer_name = req.customer_name.strip() or "Guest Customer"

    # Start atomic transaction
    try:
        now_str = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        short_id = uuid.uuid4().hex[:6].upper()
        invoice_num = f"INV-{now_str[:8]}-{short_id}"

        subtotal = Decimal("0.00")
        validated_items = []

        # Validate stock availability for all items first
        for it in req.items:
            product = db.query(Product).filter(
                Product.id == it.product_id,
                Product.tenant_id == tenant_id
            ).with_for_update().first()

            if not product:
                raise NotFoundException(f"Product '{it.product_id}' not found")
            if not product.is_active:
                raise AppException(400, f"Product '{product.name}' is inactive", "PRODUCT_INACTIVE")

            if product.stock_quantity < it.quantity:
                raise InsufficientStockException(
                    message=f"Insufficient stock for '{product.name}'. Requested: {it.quantity}, Available: {product.stock_quantity}",
                    details={
                        "product_id": product.id,
                        "product_name": product.name,
                        "requested_quantity": it.quantity,
                        "available_quantity": product.stock_quantity,
                    }
                )

            unit_price = it.unit_price if it.unit_price is not None else product.selling_price
            line_tot = round_money(Decimal(str(it.quantity)) * unit_price)
            subtotal += line_tot
            validated_items.append((product, it.quantity, unit_price, line_tot))

        tax_amount = round_money(subtotal * (req.tax_rate / Decimal("100.0")))
        discount_amount = round_money(req.discount_amount)
        if discount_amount > subtotal:
            raise AppException(422, "Discount cannot exceed subtotal", "INVALID_DISCOUNT")

        total_amount = round_money(subtotal + tax_amount - discount_amount)
        if total_amount < Decimal("0.00"):
            total_amount = Decimal("0.00")

        sale = Sale(
            tenant_id=tenant_id,
            customer_id=customer.id if customer else None,
            customer_name=customer_name,
            invoice_number=invoice_num,
            status="COMPLETED",
            subtotal=subtotal,
            tax_rate=req.tax_rate,
            tax_amount=tax_amount,
            discount_amount=discount_amount,
            total_amount=total_amount,
            payment_method=req.payment_method,
            payment_status="PAID",
            actor_id=actor_id,
        )
        db.add(sale)
        db.flush()

        # Add line items and decrement stock
        for product, qty, price, line_tot in validated_items:
            sale_item = SaleItem(
                sale_id=sale.id,
                product_id=product.id,
                product_name=product.name,
                sku=product.sku,
                quantity=qty,
                unit_price=price,
                line_total=line_tot,
            )
            db.add(sale_item)

            prev_stock = product.stock_quantity
            new_stock = prev_stock - qty
            product.stock_quantity = new_stock

            movement = StockMovement(
                tenant_id=tenant_id,
                product_id=product.id,
                movement_type="SALE",
                quantity=-qty,
                previous_stock=prev_stock,
                new_stock=new_stock,
                reason=f"Sale invoice {invoice_num}",
                actor_id=actor_id,
                reference_id=sale.id,
            )
            db.add(movement)

            # Check for low/out-of-stock alert
            if new_stock <= 0:
                alert = Alert(
                    tenant_id=tenant_id,
                    product_id=product.id,
                    alert_type="OUT_OF_STOCK",
                    severity="CRITICAL",
                    title=f"Out of Stock: {product.name}",
                    message=f"Product '{product.name}' (SKU: {product.sku}) sold out on invoice {invoice_num}.",
                )
                db.add(alert)
            elif new_stock <= product.min_stock_level:
                alert = Alert(
                    tenant_id=tenant_id,
                    product_id=product.id,
                    alert_type="LOW_STOCK",
                    severity="WARNING",
                    title=f"Low Stock: {product.name}",
                    message=f"Product '{product.name}' (SKU: {product.sku}) reached low stock ({new_stock}) on invoice {invoice_num}.",
                )
                db.add(alert)

        # Update customer cumulative spend if registered
        if customer:
            customer.total_spent = round_money(customer.total_spent + total_amount)

        # Post linked INCOME entry into financial ledger
        income_entry = FinancialTransaction(
            tenant_id=tenant_id,
            type="INCOME",
            category="SALES",
            amount=total_amount,
            reference_id=sale.id,
            description=f"Sale Invoice {invoice_num} - {customer_name}",
            actor_id=actor_id,
        )
        db.add(income_entry)

        db.commit()
        db.refresh(sale)

    except Exception:
        db.rollback()
        raise

    res = SaleResponse.model_validate(sale)
    res.items = [SaleItemResponse.model_validate(i) for i in sale.items]
    return res

def cancel_sale(
    db: Session, tenant_id: str, sale_id: str, actor_id: str
) -> SaleResponse:
    sale = db.query(Sale).filter(
        Sale.id == sale_id,
        Sale.tenant_id == tenant_id
    ).with_for_update().first()

    if not sale:
        raise NotFoundException("Sale not found")

    if sale.status == "CANCELLED":
        raise AlreadyCancelledException("Sale invoice is already cancelled")

    try:
        # Restore stock using RETURN movements
        for item in sale.items:
            product = db.query(Product).filter(
                Product.id == item.product_id,
                Product.tenant_id == tenant_id
            ).with_for_update().first()
            if product:
                prev_stock = product.stock_quantity
                new_stock = prev_stock + item.quantity
                product.stock_quantity = new_stock

                movement = StockMovement(
                    tenant_id=tenant_id,
                    product_id=product.id,
                    movement_type="RETURN",
                    quantity=item.quantity,
                    previous_stock=prev_stock,
                    new_stock=new_stock,
                    reason=f"Sale cancellation for invoice {sale.invoice_number}",
                    actor_id=actor_id,
                    reference_id=sale.id,
                )
                db.add(movement)

        # Reverse customer total_spent exactly once
        if sale.customer_id:
            customer = db.query(Customer).filter(
                Customer.id == sale.customer_id,
                Customer.tenant_id == tenant_id
            ).with_for_update().first()
            if customer:
                new_spent = customer.total_spent - sale.total_amount
                customer.total_spent = max(Decimal("0.00"), round_money(new_spent))

        sale.status = "CANCELLED"
        sale.cancelled_at = datetime.now(timezone.utc)

        # Reverse linked finance transaction
        ft = db.query(FinancialTransaction).filter(
            FinancialTransaction.reference_id == sale.id,
            FinancialTransaction.tenant_id == tenant_id,
            FinancialTransaction.is_reversed == False
        ).first()
        if ft:
            ft.is_reversed = True
            ft.reversed_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(sale)

    except Exception:
        db.rollback()
        raise

    res = SaleResponse.model_validate(sale)
    res.items = [SaleItemResponse.model_validate(i) for i in sale.items]
    return res

def get_sale(db: Session, tenant_id: str, sale_id: str) -> SaleResponse:
    sale = db.query(Sale).filter(
        Sale.id == sale_id,
        Sale.tenant_id == tenant_id
    ).first()
    if not sale:
        raise NotFoundException("Sale not found")

    res = SaleResponse.model_validate(sale)
    res.items = [SaleItemResponse.model_validate(i) for i in sale.items]
    return res

def list_sales(
    db: Session,
    tenant_id: str,
    page: int = 1,
    limit: int = 20,
) -> Tuple[List[SaleResponse], int]:
    query = db.query(Sale).filter(Sale.tenant_id == tenant_id)
    total = query.count()
    sales = query.order_by(desc(Sale.created_at)).offset((page - 1) * limit).limit(limit).all()

    result = []
    for s in sales:
        res = SaleResponse.model_validate(s)
        res.items = [SaleItemResponse.model_validate(i) for i in s.items]
        result.append(res)

    return result, total
