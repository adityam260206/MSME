import csv
import io
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
from typing import Tuple, Union
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.core.errors import AppException
from backend.app.models.sale import Sale, SaleItem
from backend.app.models.catalog import Product, Category
from backend.app.schemas.report import (
    SalesReportRequest, SalesReportResponse, SalesReportItem, SalesReportSummary
)

def round_money(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def generate_sales_report(
    db: Session, tenant_id: str, req: SalesReportRequest
) -> Union[SalesReportResponse, str]:
    try:
        start_dt = datetime.strptime(req.start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(req.end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
    except ValueError:
        raise AppException(422, "Malformed date format. Use YYYY-MM-DD", "INVALID_DATE_FORMAT")

    if start_dt > end_dt:
        raise AppException(422, "start_date must be before or equal to end_date", "INVALID_DATE_RANGE")

    query = db.query(
        Sale.id.label("sale_id"),
        Sale.invoice_number,
        Sale.created_at,
        Sale.customer_name,
        Category.name.label("category_name"),
        SaleItem.product_name,
        SaleItem.sku,
        SaleItem.quantity,
        SaleItem.unit_price,
        SaleItem.line_total,
        Sale.tax_amount,
        Sale.discount_amount
    ).join(SaleItem, Sale.id == SaleItem.sale_id
    ).join(Product, SaleItem.product_id == Product.id
    ).join(Category, Product.category_id == Category.id
    ).filter(
        Sale.tenant_id == tenant_id,
        Sale.status == "COMPLETED",
        Sale.created_at >= start_dt,
        Sale.created_at <= end_dt
    )

    if req.category_id:
        query = query.filter(Product.category_id == req.category_id)

    records = query.order_by(desc(Sale.created_at)).all()

    items = []
    total_units = 0
    total_rev = Decimal("0.00")
    unique_sale_ids = set()

    for r in records:
        unique_sale_ids.add(r.sale_id)
        total_units += r.quantity
        line_tot = round_money(r.line_total)
        total_rev += line_tot

        items.append(
            SalesReportItem(
                sale_id=r.sale_id,
                invoice_number=r.invoice_number,
                created_at=r.created_at.strftime("%Y-%m-%d %H:%M:%S UTC"),
                customer_name=r.customer_name,
                category_name=r.category_name,
                product_name=r.product_name,
                sku=r.sku,
                quantity=r.quantity,
                unit_price=round_money(r.unit_price),
                line_total=line_tot,
            )
        )

    # Calculate overall tax and discount across matching completed sales
    matching_sales = db.query(Sale).filter(
        Sale.id.in_(list(unique_sale_ids))
    ).all() if unique_sale_ids else []

    total_tax = round_money(sum((s.tax_amount for s in matching_sales), Decimal("0.00")))
    total_disc = round_money(sum((s.discount_amount for s in matching_sales), Decimal("0.00")))

    summary = SalesReportSummary(
        total_sales_count=len(unique_sale_ids),
        total_units_sold=total_units,
        total_revenue=round_money(total_rev),
        total_tax=total_tax,
        total_discount=total_disc,
    )

    if req.format == "csv":
        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
        # Header
        writer.writerow([
            "Invoice Number", "Date/Time (UTC)", "Customer Name", "Category",
            "Product Name", "SKU", "Quantity", "Unit Price", "Line Total"
        ])
        for it in items:
            writer.writerow([
                it.invoice_number,
                it.created_at,
                it.customer_name,
                it.category_name,
                it.product_name,
                it.sku,
                it.quantity,
                f"{it.unit_price:.2f}",
                f"{it.line_total:.2f}",
            ])
        # Summary footer rows
        writer.writerow([])
        writer.writerow(["SUMMARY TOTALS"])
        writer.writerow(["Total Orders", summary.total_sales_count])
        writer.writerow(["Total Units Sold", summary.total_units_sold])
        writer.writerow(["Total Revenue", f"{summary.total_revenue:.2f}"])
        writer.writerow(["Total Tax", f"{summary.total_tax:.2f}"])
        writer.writerow(["Total Discount", f"{summary.total_discount:.2f}"])
        return output.getvalue()

    return SalesReportResponse(items=items, summary=summary)
