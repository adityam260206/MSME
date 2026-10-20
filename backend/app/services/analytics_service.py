import math
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from backend.app.models.catalog import Product, Category
from backend.app.models.sale import Sale, SaleItem
from backend.app.models.finance import FinancialTransaction
from backend.app.schemas.analytics import (
    DashboardSummaryResponse, TopProductItem, DailySalesTrend,
    SalesAnalyticsResponse, InventoryAnalyticsResponse,
    ROPRecommendation, VelocityItem
)

def round_money(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def get_dashboard_summary(
    db: Session, tenant_id: str, role: str
) -> DashboardSummaryResponse:
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Today's revenue from completed sales
    today_rev_val = db.query(func.coalesce(func.sum(Sale.total_amount), 0)).filter(
        Sale.tenant_id == tenant_id,
        Sale.status == "COMPLETED",
        Sale.created_at >= today_start
    ).scalar()
    today_revenue = round_money(Decimal(str(today_rev_val)))

    # Monthly revenue & volume
    month_sales = db.query(
        func.count(Sale.id),
        func.coalesce(func.sum(Sale.total_amount), 0)
    ).filter(
        Sale.tenant_id == tenant_id,
        Sale.status == "COMPLETED",
        Sale.created_at >= month_start
    ).first()
    monthly_sales_volume = month_sales[0] or 0
    monthly_revenue = round_money(Decimal(str(month_sales[1])))

    # Monthly expenses from finance
    month_exp_val = db.query(func.coalesce(func.sum(FinancialTransaction.amount), 0)).filter(
        FinancialTransaction.tenant_id == tenant_id,
        FinancialTransaction.type == "EXPENSE",
        FinancialTransaction.is_reversed == False,
        FinancialTransaction.created_at >= month_start
    ).scalar()
    monthly_expenses = round_money(Decimal(str(month_exp_val)))

    # Monthly purchases
    month_purch_val = db.query(func.coalesce(func.sum(FinancialTransaction.amount), 0)).filter(
        FinancialTransaction.tenant_id == tenant_id,
        FinancialTransaction.type == "EXPENSE",
        FinancialTransaction.category == "PURCHASES",
        FinancialTransaction.is_reversed == False,
        FinancialTransaction.created_at >= month_start
    ).scalar()
    month_purchases = round_money(Decimal(str(month_purch_val)))

    gross_profit = round_money(monthly_revenue - month_purchases)
    gross_margin = Decimal("0.00")
    if monthly_revenue > Decimal("0.00"):
        gross_margin = round_money((gross_profit / monthly_revenue) * Decimal("100.00"))

    # Product counts
    products = db.query(Product).filter(
        Product.tenant_id == tenant_id,
        Product.is_active == True
    ).all()
    total_products = len(products)
    out_of_stock_count = sum(1 for p in products if p.stock_quantity <= 0)
    low_stock_count = sum(1 for p in products if 0 < p.stock_quantity <= p.min_stock_level)

    # Top products by quantity sold
    top_items_query = db.query(
        SaleItem.product_id,
        SaleItem.product_name,
        SaleItem.sku,
        func.sum(SaleItem.quantity).label("units_sold"),
        func.sum(SaleItem.line_total).label("revenue")
    ).join(Sale, Sale.id == SaleItem.sale_id).filter(
        Sale.tenant_id == tenant_id,
        Sale.status == "COMPLETED",
        Sale.created_at >= month_start
    ).group_by(
        SaleItem.product_id, SaleItem.product_name, SaleItem.sku
    ).order_by(desc("units_sold")).limit(5).all()

    top_products: List[TopProductItem] = []
    prod_stock_map = {p.id: p.stock_quantity for p in products}
    for item in top_items_query:
        pid, pname, psku, units, rev = item
        stock = prod_stock_map.get(pid, 0)
        product_rev = round_money(Decimal(str(rev))) if role != "STAFF" else None
        top_products.append(
            TopProductItem(
                product_id=pid,
                product_name=pname,
                sku=psku,
                stock_quantity=stock,
                units_sold=int(units),
                revenue=product_rev,
            )
        )

    res = DashboardSummaryResponse(
        role=role,
        monthly_sales_volume=monthly_sales_volume,
        total_products=total_products,
        low_stock_count=low_stock_count,
        out_of_stock_count=out_of_stock_count,
        top_products=top_products,
    )

    # Apply role-based filtering per SRS matrix
    if role in ["ADMIN", "OWNER"]:
        res.today_revenue = today_revenue
        res.monthly_revenue = monthly_revenue
        res.monthly_expenses = monthly_expenses
        res.gross_profit = gross_profit
        res.gross_profit_margin = gross_margin
    elif role == "MANAGER":
        res.today_revenue = today_revenue
        res.monthly_revenue = monthly_revenue
        # Hide expenses, profit, and margin from MANAGER
        res.monthly_expenses = None
        res.gross_profit = None
        res.gross_profit_margin = None
    elif role == "STAFF":
        # STAFF sees restricted operational totals only
        res.today_revenue = None
        res.monthly_revenue = None
        res.monthly_expenses = None
        res.gross_profit = None
        res.gross_profit_margin = None

    return res

def get_sales_analytics(
    db: Session, tenant_id: str, role: str
) -> SalesAnalyticsResponse:
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    # Completed sales grouped by date
    sales = db.query(Sale).filter(
        Sale.tenant_id == tenant_id,
        Sale.status == "COMPLETED",
        Sale.created_at >= thirty_days_ago
    ).order_by(Sale.created_at.asc()).all()

    daily_map: Dict[str, Dict[str, Any]] = {}
    for i in range(30):
        d_str = (thirty_days_ago + timedelta(days=i+1)).strftime("%Y-%m-%d")
        daily_map[d_str] = {"sales_count": 0, "revenue": Decimal("0.00")}

    for s in sales:
        d_str = s.created_at.strftime("%Y-%m-%d")
        if d_str in daily_map:
            daily_map[d_str]["sales_count"] += 1
            daily_map[d_str]["revenue"] += s.total_amount

    trends: List[DailySalesTrend] = []
    for d_str, v in daily_map.items():
        rev = round_money(v["revenue"]) if role != "STAFF" else None
        trends.append(
            DailySalesTrend(
                date=d_str,
                sales_count=v["sales_count"],
                revenue=rev,
            )
        )

    # Top selling by quantity
    top_by_qty_q = db.query(
        SaleItem.product_id,
        SaleItem.product_name,
        SaleItem.sku,
        func.sum(SaleItem.quantity).label("units_sold"),
        func.sum(SaleItem.line_total).label("revenue")
    ).join(Sale, Sale.id == SaleItem.sale_id).filter(
        Sale.tenant_id == tenant_id,
        Sale.status == "COMPLETED",
        Sale.created_at >= thirty_days_ago
    ).group_by(
        SaleItem.product_id, SaleItem.product_name, SaleItem.sku
    ).order_by(desc("units_sold")).limit(10).all()

    products = db.query(Product).filter(Product.tenant_id == tenant_id).all()
    prod_stock_map = {p.id: p.stock_quantity for p in products}

    top_by_qty: List[TopProductItem] = []
    for pid, pname, psku, units, rev in top_by_qty_q:
        rev_val = round_money(Decimal(str(rev))) if role != "STAFF" else None
        top_by_qty.append(
            TopProductItem(
                product_id=pid,
                product_name=pname,
                sku=psku,
                stock_quantity=prod_stock_map.get(pid, 0),
                units_sold=int(units),
                revenue=rev_val,
            )
        )

    top_by_rev: Optional[List[TopProductItem]] = None
    if role != "STAFF":
        top_by_rev_q = sorted(top_by_qty, key=lambda x: x.revenue or Decimal("0.00"), reverse=True)
        top_by_rev = top_by_rev_q

    return SalesAnalyticsResponse(
        trends=trends,
        top_selling_by_quantity=top_by_qty,
        top_selling_by_revenue=top_by_rev,
    )

def get_inventory_analytics(
    db: Session, tenant_id: str
) -> InventoryAnalyticsResponse:
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    products = db.query(Product).filter(
        Product.tenant_id == tenant_id,
        Product.is_active == True
    ).all()

    total_products = len(products)
    out_of_stock_count = sum(1 for p in products if p.stock_quantity <= 0)
    low_stock_count = sum(1 for p in products if 0 < p.stock_quantity <= p.min_stock_level)

    # Category distribution
    categories = db.query(Category).filter(
        Category.tenant_id == tenant_id,
        Category.is_active == True
    ).all()
    cat_map = {c.id: c.name for c in categories}
    cat_dist: Dict[str, int] = {}
    for p in products:
        c_name = cat_map.get(p.category_id, "Uncategorized")
        cat_dist[c_name] = cat_dist.get(c_name, 0) + 1

    # 30-day unit sales per product for ROP and Velocity
    sales_30d = db.query(
        SaleItem.product_id,
        func.sum(SaleItem.quantity).label("total_units")
    ).join(Sale, Sale.id == SaleItem.sale_id).filter(
        Sale.tenant_id == tenant_id,
        Sale.status == "COMPLETED",
        Sale.created_at >= thirty_days_ago
    ).group_by(SaleItem.product_id).all()

    sales_units_map = {pid: int(units) for pid, units in sales_30d}

    rop_list: List[ROPRecommendation] = []
    velocity_list: List[VelocityItem] = []

    for p in products:
        units_30d = sales_units_map.get(p.id, 0)
        # Average Daily Usage = total units sold in 30 days / 30.0
        avg_daily_usage = round_money(Decimal(str(units_30d)) / Decimal("30.0"))

        # Dynamic ROP = (Average Daily Usage * Lead Time) + Safety Stock
        rop_exact = (avg_daily_usage * Decimal(str(p.lead_time_days))) + Decimal(str(p.safety_stock))
        rop_rounded = round_money(rop_exact)
        reorder_threshold = int(math.ceil(float(rop_exact)))
        recommended_order_qty = max(0, reorder_threshold - p.stock_quantity)

        status = "OK"
        if p.stock_quantity <= 0:
            status = "CRITICAL"
        elif p.stock_quantity <= reorder_threshold:
            status = "REORDER_NOW"

        rop_list.append(
            ROPRecommendation(
                product_id=p.id,
                product_name=p.name,
                sku=p.sku,
                current_stock=p.stock_quantity,
                min_stock_level=p.min_stock_level,
                avg_daily_usage=avg_daily_usage,
                lead_time_days=p.lead_time_days,
                safety_stock=p.safety_stock,
                reorder_point=rop_rounded,
                recommended_order_quantity=recommended_order_qty,
                status=status,
            )
        )

        # Velocity classification: Fast >= 20 units, Medium 5-19 units, Slow < 5 units
        if units_30d >= 20:
            vel_cat = "Fast-Moving"
        elif units_30d >= 5:
            vel_cat = "Medium-Moving"
        else:
            vel_cat = "Slow-Moving"

        velocity_list.append(
            VelocityItem(
                product_id=p.id,
                product_name=p.name,
                sku=p.sku,
                units_sold_30d=units_30d,
                velocity_category=vel_cat,
            )
        )

    return InventoryAnalyticsResponse(
        total_products=total_products,
        low_stock_count=low_stock_count,
        out_of_stock_count=out_of_stock_count,
        category_distribution=cat_dist,
        rop_recommendations=rop_list,
        velocity_classification=velocity_list,
    )
