from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from backend.app.models.finance import FinancialTransaction
from backend.app.models.sale import Sale
from backend.app.schemas.finance import (
    FinancialTransactionCreate, FinancialTransactionResponse, FinanceSummaryResponse
)

def round_money(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def get_finance_summary(db: Session, tenant_id: str) -> FinanceSummaryResponse:
    # Query non-reversed income transactions
    income_res = db.query(func.coalesce(func.sum(FinancialTransaction.amount), 0)).filter(
        FinancialTransaction.tenant_id == tenant_id,
        FinancialTransaction.type == "INCOME",
        FinancialTransaction.is_reversed == False,
    ).scalar()
    total_revenue = round_money(Decimal(str(income_res)))

    # Query non-reversed expense transactions
    expense_res = db.query(func.coalesce(func.sum(FinancialTransaction.amount), 0)).filter(
        FinancialTransaction.tenant_id == tenant_id,
        FinancialTransaction.type == "EXPENSE",
        FinancialTransaction.is_reversed == False,
    ).scalar()
    total_expenses = round_money(Decimal(str(expense_res)))

    # Purchases expense
    purchases_res = db.query(func.coalesce(func.sum(FinancialTransaction.amount), 0)).filter(
        FinancialTransaction.tenant_id == tenant_id,
        FinancialTransaction.type == "EXPENSE",
        FinancialTransaction.category == "PURCHASES",
        FinancialTransaction.is_reversed == False,
    ).scalar()
    purchases_expense = round_money(Decimal(str(purchases_res)))

    # Calculations per SRS
    gross_profit = round_money(total_revenue - purchases_expense)
    net_profit = round_money(total_revenue - total_expenses)

    if total_revenue > Decimal("0.00"):
        profit_margin = round_money((net_profit / total_revenue) * Decimal("100.00"))
    else:
        profit_margin = Decimal("0.00")

    # Receivables from sales with UNPAID / PARTIAL status if any
    # (By default in v1, completed sales are marked PAID, but if unpaid sales exist calculate aging)
    now = datetime.now(timezone.utc)
    aging_buckets: Dict[str, Decimal] = {
        "0-30": Decimal("0.00"),
        "31-60": Decimal("0.00"),
        "61-90": Decimal("0.00"),
        "91+": Decimal("0.00"),
    }
    unpaid_sales = db.query(Sale).filter(
        Sale.tenant_id == tenant_id,
        Sale.status == "COMPLETED",
        Sale.payment_status.in_(["UNPAID", "PENDING"])
    ).all()

    receivables_tot = Decimal("0.00")
    for s in unpaid_sales:
        days_old = (now - s.created_at.replace(tzinfo=timezone.utc)).days
        amt = s.total_amount
        receivables_tot += amt
        if days_old <= 30:
            aging_buckets["0-30"] += amt
        elif days_old <= 60:
            aging_buckets["31-60"] += amt
        elif days_old <= 90:
            aging_buckets["61-90"] += amt
        else:
            aging_buckets["91+"] += amt

    for k in aging_buckets:
        aging_buckets[k] = round_money(aging_buckets[k])

    return FinanceSummaryResponse(
        total_revenue=total_revenue,
        total_expenses=total_expenses,
        purchases_expense=purchases_expense,
        gross_profit=gross_profit,
        net_profit=net_profit,
        profit_margin_percent=profit_margin,
        receivables_total=round_money(receivables_tot),
        payables_total=Decimal("0.00"),
        receivables_aging=aging_buckets,
    )

def list_financial_transactions(
    db: Session,
    tenant_id: str,
    trans_type: Optional[str] = None,
    category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
) -> Tuple[List[FinancialTransactionResponse], int]:
    query = db.query(FinancialTransaction).filter(
        FinancialTransaction.tenant_id == tenant_id
    )

    if trans_type:
        query = query.filter(FinancialTransaction.type == trans_type)
    if category:
        query = query.filter(FinancialTransaction.category == category)
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(FinancialTransaction.created_at >= start_dt)
        except ValueError:
            pass
    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            query = query.filter(FinancialTransaction.created_at <= end_dt)
        except ValueError:
            pass

    total = query.count()
    txs = query.order_by(desc(FinancialTransaction.created_at)).offset((page - 1) * limit).limit(limit).all()

    result = [FinancialTransactionResponse.model_validate(t) for t in txs]
    return result, total

def create_manual_transaction(
    db: Session,
    tenant_id: str,
    actor_id: str,
    req: FinancialTransactionCreate,
) -> FinancialTransactionResponse:
    tx = FinancialTransaction(
        tenant_id=tenant_id,
        type=req.type,
        category=req.category,
        amount=round_money(req.amount),
        description=req.description,
        reference_id=req.reference_id,
        actor_id=actor_id,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return FinancialTransactionResponse.model_validate(tx)
