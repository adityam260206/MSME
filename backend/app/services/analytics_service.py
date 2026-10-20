import math
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from backend.app.models.catalog import Product, Category
from backend.app.models.sale import Sale, SaleItem
from backend.app.models.finance import FinancialTransaction
from backend.app.models.purchase import Purchase, PurchaseItem
from backend.app.models.supplier import Supplier
from backend.app.models.inventory import StockMovement
from backend.app.models.customer import Customer
from backend.app.schemas.analytics import (
    DashboardSummaryResponse, TopProductItem, DailySalesTrend,
    SalesAnalyticsResponse, InventoryAnalyticsResponse,
    ROPRecommendation, VelocityItem,
    ReplenishmentPlanItem, ReplenishmentPlanResponse,
    AnomalyItem, AnomalyReportResponse,
    ProductProfitabilityItem, ProfitabilityAnalyticsResponse,
    CashFlowItem, CashFlowProjectionResponse,
    ActionCenterItem, ActionCenterResponse
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

def get_replenishment_planner(db: Session, tenant_id: str) -> ReplenishmentPlanResponse:
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    products = db.query(Product).filter(
        Product.tenant_id == tenant_id,
        Product.is_active == True,
    ).all()

    sales_30d = db.query(
        SaleItem.product_id,
        func.sum(SaleItem.quantity).label("total_units")
    ).join(Sale, Sale.id == SaleItem.sale_id).filter(
        Sale.tenant_id == tenant_id,
        Sale.status == "COMPLETED",
        Sale.created_at >= thirty_days_ago
    ).group_by(SaleItem.product_id).all()

    sales_map = {pid: int(units) for pid, units in sales_30d}

    # Find preferred suppliers from recent purchases
    supplier_map = {}
    recent_purchases = db.query(
        PurchaseItem.product_id,
        Supplier.id.label("supplier_id"),
        Supplier.name.label("supplier_name"),
    ).join(Purchase, Purchase.id == PurchaseItem.purchase_id
    ).join(Supplier, Supplier.id == Purchase.supplier_id
    ).filter(
        Purchase.tenant_id == tenant_id
    ).order_by(desc(Purchase.created_at)).all()

    for pid, s_id, s_name in recent_purchases:
        if pid not in supplier_map:
            supplier_map[pid] = (s_id, s_name)

    # Fallback supplier if none found
    first_supplier = db.query(Supplier).filter(Supplier.tenant_id == tenant_id).first()
    fallback_supplier = (first_supplier.id, first_supplier.name) if first_supplier else (None, None)

    items: List[ReplenishmentPlanItem] = []
    total_cost = Decimal("0.00")

    for p in products:
        units_30d = sales_map.get(p.id, 0)
        daily_usage = round_money(Decimal(str(units_30d)) / Decimal("30.0"))
        lead_time = p.lead_time_days or 7
        safety_stock = p.safety_stock or 5
        rop_exact = (daily_usage * Decimal(str(lead_time))) + Decimal(str(safety_stock))
        rop_rounded = round_money(rop_exact)
        reorder_threshold = int(math.ceil(float(rop_exact)))

        urgency = "OPTIMAL"
        rec_qty = 0
        if p.stock_quantity <= 0:
            urgency = "CRITICAL"
            rec_qty = max(safety_stock * 2, reorder_threshold * 2)
        elif p.stock_quantity <= safety_stock:
            urgency = "HIGH"
            rec_qty = max(safety_stock * 2 - p.stock_quantity, reorder_threshold * 2 - p.stock_quantity)
        elif p.stock_quantity <= reorder_threshold:
            urgency = "MODERATE"
            rec_qty = max(reorder_threshold * 2 - p.stock_quantity, safety_stock)

        unit_cost = Decimal(str(p.cost_price or 0.00))
        est_cost = round_money(Decimal(str(rec_qty)) * unit_cost) if rec_qty > 0 else Decimal("0.00")

        s_id, s_name = supplier_map.get(p.id, fallback_supplier)

        explanation = (
            f"Stock ({p.stock_quantity}) vs ROP ({rop_rounded}). "
            f"Daily velocity: {daily_usage} units/day. Lead time: {lead_time} days. "
            f"Estimated runway: {round(float(p.stock_quantity / daily_usage), 1) if daily_usage > 0 else 'Unlimited'} days."
        )

        cat_name = p.category.name if p.category else "General"

        item = ReplenishmentPlanItem(
            product_id=p.id,
            product_name=p.name,
            sku=p.sku,
            category_name=cat_name,
            current_stock=p.stock_quantity,
            avg_daily_usage=daily_usage,
            lead_time_days=lead_time,
            safety_stock=safety_stock,
            reorder_point=rop_rounded,
            recommended_order_quantity=rec_qty,
            unit_cost_price=unit_cost,
            estimated_total_cost=est_cost,
            preferred_supplier_id=s_id,
            preferred_supplier_name=s_name,
            urgency=urgency,
            explanation=explanation,
        )
        items.append(item)
        if rec_qty > 0:
            total_cost += est_cost

    # Sort so urgent items appear first
    urgency_order = {"CRITICAL": 0, "HIGH": 1, "MODERATE": 2, "OPTIMAL": 3}
    items.sort(key=lambda x: (urgency_order.get(x.urgency, 4), -x.recommended_order_quantity))

    reorder_count = sum(1 for it in items if it.recommended_order_quantity > 0)

    return ReplenishmentPlanResponse(
        items=items,
        total_reorder_items_count=reorder_count,
        total_estimated_replenishment_cost=round_money(total_cost),
    )

def get_anomaly_report(db: Session, tenant_id: str) -> AnomalyReportResponse:
    now = datetime.now(timezone.utc)
    anomalies: List[AnomalyItem] = []

    # 1. Sales drop check: past 7 days vs prior 7 days
    last_7d = now - timedelta(days=7)
    prior_7d = now - timedelta(days=14)

    recent_sales_val = db.query(func.coalesce(func.sum(Sale.total_amount), 0)).filter(
        Sale.tenant_id == tenant_id,
        Sale.status == "COMPLETED",
        Sale.created_at >= last_7d
    ).scalar()

    prior_sales_val = db.query(func.coalesce(func.sum(Sale.total_amount), 0)).filter(
        Sale.tenant_id == tenant_id,
        Sale.status == "COMPLETED",
        Sale.created_at >= prior_7d,
        Sale.created_at < last_7d
    ).scalar()

    recent_sales = Decimal(str(recent_sales_val))
    prior_sales = Decimal(str(prior_sales_val))

    if prior_sales > 1000 and recent_sales < (prior_sales * Decimal("0.70")):
        anomalies.append(
            AnomalyItem(
                id=f"anomaly-sales-drop-{now.strftime('%Y%m%d')}",
                condition="Sales Volume Sudden Drop (>30%)",
                severity="HIGH",
                category="SALES",
                observed_value=f"₹{recent_sales:,.2f} (past 7 days)",
                baseline_value=f"₹{prior_sales:,.2f} (prior 7 days)",
                affected_entity="POS Sales Module",
                suggested_action="Review seasonal demand shifts, marketing outreach, or checkout terminal stability.",
                navigation_path="/sales",
                created_at=now.isoformat(),
            )
        )

    # 2. Stockout risk on fast/medium moving items
    risky_products = db.query(Product).filter(
        Product.tenant_id == tenant_id,
        Product.is_active == True,
        Product.stock_quantity <= 2,
    ).all()

    for p in risky_products:
        anomalies.append(
            AnomalyItem(
                id=f"anomaly-stockout-{p.id}",
                condition="Imminent Stockout Risk",
                severity="HIGH" if p.stock_quantity == 0 else "MEDIUM",
                category="INVENTORY",
                observed_value=f"{p.stock_quantity} units remaining",
                baseline_value=f"Min threshold: {p.min_stock_level} units",
                affected_entity=f"{p.name} ({p.sku})",
                suggested_action="Generate urgent purchase order to restock before stockout halts sales.",
                navigation_path="/purchases",
                created_at=now.isoformat(),
            )
        )

    # 3. Unusual Inventory adjustments (damages or shrinkage)
    damages = db.query(StockMovement).filter(
        StockMovement.tenant_id == tenant_id,
        StockMovement.created_at >= last_7d,
        StockMovement.movement_type.in_(["DAMAGE", "MANUAL_ADJUSTMENT"]),
    ).all()

    for sm in damages:
        if abs(sm.quantity_change) >= 10 or sm.movement_type == "DAMAGE":
            anomalies.append(
                AnomalyItem(
                    id=f"anomaly-inv-{sm.id}",
                    condition="Significant Inventory Shrinkage/Damage",
                    severity="MEDIUM",
                    category="INVENTORY",
                    observed_value=f"{sm.quantity_change} units ({sm.reason or sm.movement_type})",
                    baseline_value="Zero expected shrinkage",
                    affected_entity=sm.product.name if sm.product else "Inventory Item",
                    suggested_action="Conduct physical warehouse audit to verify handling or storage conditions.",
                    navigation_path="/inventory",
                    created_at=sm.created_at.isoformat() if sm.created_at else now.isoformat(),
                )
            )

    # 4. Overdue receivables (unpaid sales older than 30 days)
    thirty_days_ago = now - timedelta(days=30)
    overdue_sales = db.query(Sale).filter(
        Sale.tenant_id == tenant_id,
        Sale.status == "COMPLETED",
        Sale.payment_status.in_(["PENDING", "PARTIAL"]),
        Sale.created_at < thirty_days_ago
    ).all()

    if overdue_sales:
        total_overdue = sum(Decimal(str(s.total_amount or 0.00)) for s in overdue_sales)
        anomalies.append(
            AnomalyItem(
                id=f"anomaly-debtors-{now.strftime('%Y%m%d')}",
                condition="Overdue Receivables (>30 Days)",
                severity="HIGH",
                category="RECEIVABLES",
                observed_value=f"₹{total_overdue:,.2f} across {len(overdue_sales)} sales",
                baseline_value="0 overdue invoices",
                affected_entity="Customer Accounts Receivable",
                suggested_action="Send payment reminders or trigger debtor collection workflows.",
                navigation_path="/finance",
                created_at=now.isoformat(),
            )
        )

    high_count = sum(1 for a in anomalies if a.severity == "HIGH")
    med_count = sum(1 for a in anomalies if a.severity == "MEDIUM")

    return AnomalyReportResponse(
        anomalies=anomalies,
        high_severity_count=high_count,
        medium_severity_count=med_count,
    )

def get_product_profitability(db: Session, tenant_id: str) -> ProfitabilityAnalyticsResponse:
    products = db.query(Product).filter(
        Product.tenant_id == tenant_id,
        Product.is_active == True,
    ).all()

    sales_items = db.query(
        SaleItem.product_id,
        func.sum(SaleItem.quantity).label("units_sold"),
        func.sum(SaleItem.line_total).label("revenue")
    ).join(Sale, Sale.id == SaleItem.sale_id).filter(
        Sale.tenant_id == tenant_id,
        Sale.status == "COMPLETED"
    ).group_by(SaleItem.product_id).all()

    sales_dict = {pid: (int(u), Decimal(str(r))) for pid, u, r in sales_items}

    items: List[ProductProfitabilityItem] = []
    total_rev = Decimal("0.00")
    total_cogs = Decimal("0.00")

    for p in products:
        units, rev = sales_dict.get(p.id, (0, Decimal("0.00")))
        cost_unit = Decimal(str(p.cost_price or 0.00))
        selling_unit = Decimal(str(p.selling_price or 0.00))
        cogs = round_money(Decimal(str(units)) * cost_unit)
        profit = round_money(rev - cogs)

        margin_pct = Decimal("0.00")
        if rev > 0:
            margin_pct = round_money((profit / rev) * Decimal("100.00"))
        elif selling_unit > 0:
            margin_pct = round_money(((selling_unit - cost_unit) / selling_unit) * Decimal("100.00"))

        # Quadrant classification:
        # High volume >= 5 units sold
        # High margin >= 30%
        if units >= 5 and margin_pct >= 30:
            quad = "STAR"
        elif units >= 5 and margin_pct < 30:
            quad = "CASH_COW"
        elif units < 5 and margin_pct >= 30:
            quad = "OPPORTUNITY"
        else:
            quad = "UNDERPERFORMER"

        cat_name = p.category.name if p.category else "General"

        items.append(
            ProductProfitabilityItem(
                product_id=p.id,
                product_name=p.name,
                sku=p.sku,
                category_name=cat_name,
                units_sold=units,
                total_revenue=rev,
                unit_selling_price=selling_unit,
                unit_cost_price=cost_unit,
                total_estimated_cost=cogs,
                gross_profit=profit,
                gross_margin_percent=margin_pct,
                quadrant=quad,
            )
        )
        total_rev += rev
        total_cogs += cogs

    items.sort(key=lambda x: -x.gross_profit)
    overall_profit = round_money(total_rev - total_cogs)
    overall_margin = Decimal("0.00")
    if total_rev > 0:
        overall_margin = round_money((overall_profit / total_rev) * Decimal("100.00"))

    return ProfitabilityAnalyticsResponse(
        products=items,
        total_sales_revenue=round_money(total_rev),
        total_estimated_cogs=round_money(total_cogs),
        overall_gross_profit=overall_profit,
        overall_gross_margin_percent=overall_margin,
    )

def get_cash_flow_projection(db: Session, tenant_id: str) -> CashFlowProjectionResponse:
    now = datetime.now(timezone.utc)

    # 1. Current cash position from settled financial transactions
    income_val = db.query(func.coalesce(func.sum(FinancialTransaction.amount), 0)).filter(
        FinancialTransaction.tenant_id == tenant_id,
        FinancialTransaction.type == "INCOME",
        FinancialTransaction.is_reversed == False,
    ).scalar()

    expense_val = db.query(func.coalesce(func.sum(FinancialTransaction.amount), 0)).filter(
        FinancialTransaction.tenant_id == tenant_id,
        FinancialTransaction.type == "EXPENSE",
        FinancialTransaction.is_reversed == False,
    ).scalar()

    current_cash = Decimal(str(income_val)) - Decimal(str(expense_val))

    # 2. Inflows from pending sales receivables
    pending_sales = db.query(Sale).filter(
        Sale.tenant_id == tenant_id,
        Sale.status == "COMPLETED",
        Sale.payment_status.in_(["PENDING", "PARTIAL"])
    ).all()

    projected_inflows = Decimal("0.00")
    schedule: List[CashFlowItem] = []

    for s in pending_sales:
        amt = Decimal(str(s.total_amount or 0.00))
        projected_inflows += amt
        c_name = s.customer.name if s.customer else f"Invoice #{s.invoice_number}"
        due_str = (s.created_at + timedelta(days=15)).strftime("%Y-%m-%d") if s.created_at else now.strftime("%Y-%m-%d")
        schedule.append(
            CashFlowItem(
                date_or_bucket=due_str,
                source_type="RECEIVABLE",
                entity_name=f"{c_name} (Inv {s.invoice_number})",
                amount=amt,
                is_inflow=True,
                status="Expected Inflow",
            )
        )

    # 3. Outflows from confirmed purchases awaiting payment/delivery
    pending_purchases = db.query(Purchase).filter(
        Purchase.tenant_id == tenant_id,
        Purchase.status.in_(["DRAFT", "CONFIRMED"])
    ).all()

    projected_outflows = Decimal("0.00")
    for po in pending_purchases:
        amt = Decimal(str(po.total_amount or 0.00))
        projected_outflows += amt
        s_name = po.supplier.name if po.supplier else f"PO #{po.po_number}"
        due_str = (po.created_at + timedelta(days=7)).strftime("%Y-%m-%d") if po.created_at else now.strftime("%Y-%m-%d")
        schedule.append(
            CashFlowItem(
                date_or_bucket=due_str,
                source_type="PAYABLE",
                entity_name=f"{s_name} (PO {po.po_number})",
                amount=amt,
                is_inflow=False,
                status="Committed Outflow",
            )
        )

    # 4. Recurring estimated operating expenses based on average non-purchase expenses
    last_30d = now - timedelta(days=30)
    opex_val = db.query(func.coalesce(func.sum(FinancialTransaction.amount), 0)).filter(
        FinancialTransaction.tenant_id == tenant_id,
        FinancialTransaction.type == "EXPENSE",
        FinancialTransaction.category != "PURCHASES",
        FinancialTransaction.is_reversed == False,
        FinancialTransaction.created_at >= last_30d
    ).scalar()
    est_monthly_opex = Decimal(str(opex_val))
    if est_monthly_opex > 0:
        projected_outflows += est_monthly_opex
        schedule.append(
            CashFlowItem(
                date_or_bucket=(now + timedelta(days=30)).strftime("%Y-%m-%d"),
                source_type="RECURRING",
                entity_name="Estimated Monthly Operating Overhead (Rent/Utilities/Wages)",
                amount=est_monthly_opex,
                is_inflow=False,
                status="Estimated Overhead",
            )
        )

    projected_net = round_money(current_cash + projected_inflows - projected_outflows)

    assumptions = [
        "Customer invoices are projected for settlement within standard 15-day credit terms.",
        "Confirmed purchase orders reflect committed payables due upon supplier delivery.",
        "Operational overhead estimates reflect rolling 30-day non-procurement expenses.",
        "No live external bank sync is assumed; projections strictly reflect persisted internal ledger records."
    ]

    return CashFlowProjectionResponse(
        current_cash_position=round_money(current_cash),
        projected_inflows_30d=round_money(projected_inflows),
        projected_outflows_30d=round_money(projected_outflows),
        projected_net_30d=projected_net,
        schedule=schedule,
        assumptions=assumptions,
    )

def get_action_center(db: Session, tenant_id: str) -> ActionCenterResponse:
    actions: List[ActionCenterItem] = []

    # 1. Low stock / stockout items
    low_stock_products = db.query(Product).filter(
        Product.tenant_id == tenant_id,
        Product.is_active == True,
        Product.stock_quantity <= Product.min_stock_level,
    ).all()

    for p in low_stock_products[:5]:
        actions.append(
            ActionCenterItem(
                id=f"act-stock-{p.id}",
                title=f"Restock {p.name}",
                description=f"Current stock ({p.stock_quantity}) is at or below safety threshold ({p.min_stock_level}).",
                severity="HIGH" if p.stock_quantity == 0 else "MEDIUM",
                category="STOCK",
                action_label="Create Purchase Order",
                navigation_path="/purchases",
                entity_id=p.id,
            )
        )

    # 2. Overdue receivables
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)
    overdue_sales = db.query(Sale).filter(
        Sale.tenant_id == tenant_id,
        Sale.status == "COMPLETED",
        Sale.payment_status.in_(["PENDING", "PARTIAL"]),
        Sale.created_at < thirty_days_ago
    ).all()

    for s in overdue_sales[:5]:
        c_name = s.customer.name if s.customer else "Guest"
        actions.append(
            ActionCenterItem(
                id=f"act-rec-{s.id}",
                title=f"Collect ₹{s.total_amount or 0} from {c_name}",
                description=f"Invoice #{s.invoice_number} is past due date.",
                severity="HIGH",
                category="RECEIVABLE",
                action_label="View Finance Ledger",
                navigation_path="/finance",
                entity_id=s.id,
            )
        )

    # 3. Unreceived purchase orders (CONFIRMED)
    confirmed_pos = db.query(Purchase).filter(
        Purchase.tenant_id == tenant_id,
        Purchase.status == "CONFIRMED"
    ).all()

    for po in confirmed_pos[:5]:
        s_name = po.supplier.name if po.supplier else "Supplier"
        actions.append(
            ActionCenterItem(
                id=f"act-po-{po.id}",
                title=f"Receive Goods: PO #{po.po_number}",
                description=f"Supplier {s_name} order is confirmed and awaiting warehouse GRN receipt.",
                severity="MEDIUM",
                category="PROCUREMENT",
                action_label="Log Goods Receipt (GRN)",
                navigation_path="/purchases",
                entity_id=po.id,
            )
        )

    return ActionCenterResponse(
        actions=actions,
        total_pending_actions=len(actions),
    )

