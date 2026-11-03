import json
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from backend.app.models.tenant import Tenant
from backend.app.models.user import User
from backend.app.models.sale import Sale, SaleItem
from backend.app.models.purchase import Purchase
from backend.app.models.finance import FinancialTransaction
from backend.app.models.catalog import Product
from backend.app.models.risk_score import EnterpriseRiskScore
from backend.app.models.audit_log import AuditLog
from backend.app.schemas.credit_risk import (
    RiskMetricsSnapshot, ReasonCodeDetail, CreditRiskEvaluationResponse, CreditRiskHistoryItem
)

BANKING_DISCLAIMER = (
    "NOTICE: This risk assessment represents a project-level operational feasibility evaluation "
    "computed from internal transaction, inventory, and ledger history. It is designed to assist "
    "management in understanding bank loan eligibility factors. It does NOT constitute a statutory "
    "CIBIL/Experian credit score or a guaranteed sanction decision by commercial lending institutions."
)

METHOD_VERSION = "v1.0-msme-banking-standard"

def round_money(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

class CreditRiskService:
    @staticmethod
    def evaluate_risk(db: Session, tenant_id: str, evaluator: Optional[User] = None) -> CreditRiskEvaluationResponse:
        now = datetime.now(timezone.utc)
        thirty_days_ago = now - timedelta(days=30)
        sixty_days_ago = now - timedelta(days=60)

        # 1. Gather 30-day Revenue from completed sales
        rev_val = db.query(func.coalesce(func.sum(Sale.total_amount), 0)).filter(
            Sale.tenant_id == tenant_id,
            Sale.status == "COMPLETED",
            Sale.created_at >= thirty_days_ago
        ).scalar()
        total_revenue_30d = round_money(Decimal(str(rev_val)))

        # Count completed sales transactions in 30d
        sales_count_30d = db.query(func.count(Sale.id)).filter(
            Sale.tenant_id == tenant_id,
            Sale.status == "COMPLETED",
            Sale.created_at >= thirty_days_ago
        ).scalar() or 0

        # 2. Gather 30-day Expenses from financial ledger
        exp_val = db.query(func.coalesce(func.sum(FinancialTransaction.amount), 0)).filter(
            FinancialTransaction.tenant_id == tenant_id,
            FinancialTransaction.type == "EXPENSE",
            FinancialTransaction.is_reversed == False,
            FinancialTransaction.created_at >= thirty_days_ago
        ).scalar()
        total_expenses_30d = round_money(Decimal(str(exp_val)))

        # Net operating cash flow & profit margin
        net_operating_cashflow_30d = round_money(total_revenue_30d - total_expenses_30d)
        operating_margin_pct = Decimal("0.00")
        if total_revenue_30d > Decimal("0.00"):
            operating_margin_pct = round_money((net_operating_cashflow_30d / total_revenue_30d) * Decimal("100.00"))

        # 3. Debtor Aging & Receivables
        # Unpaid sales count as accounts receivable
        unpaid_sales = db.query(Sale).filter(
            Sale.tenant_id == tenant_id,
            Sale.status == "COMPLETED",
            Sale.payment_status.in_(["PENDING", "UNPAID", "PARTIAL"])
        ).all()

        total_receivables = Decimal("0.00")
        overdue_60d_plus = Decimal("0.00")
        for s in unpaid_sales:
            total_receivables += s.total_amount
            if s.created_at < sixty_days_ago:
                overdue_60d_plus += s.total_amount

        total_receivables = round_money(total_receivables)
        overdue_60d_plus = round_money(overdue_60d_plus)
        delinquent_ratio_pct = Decimal("0.00")
        if total_receivables > Decimal("0.00"):
            delinquent_ratio_pct = round_money((overdue_60d_plus / total_receivables) * Decimal("100.00"))

        # 4. Inventory health & turnover
        products = db.query(Product).filter(
            Product.tenant_id == tenant_id,
            Product.is_active == True
        ).all()
        total_prods = len(products)

        # 30-day items sold
        items_sold_30d = db.query(
            func.coalesce(func.sum(SaleItem.quantity), 0)
        ).join(Sale, Sale.id == SaleItem.sale_id).filter(
            Sale.tenant_id == tenant_id,
            Sale.status == "COMPLETED",
            Sale.created_at >= thirty_days_ago
        ).scalar() or 0

        total_stock_on_hand = sum(p.stock_quantity for p in products)
        inv_turnover = Decimal("0.00")
        if total_stock_on_hand > 0:
            inv_turnover = round_money(Decimal(str(items_sold_30d)) / Decimal(str(total_stock_on_hand)))

        # Products with 0 units sold in 30d and positive stock
        prods_with_sales = set(
            r[0] for r in db.query(SaleItem.product_id).join(Sale).filter(
                Sale.tenant_id == tenant_id,
                Sale.created_at >= thirty_days_ago
            ).distinct().all()
        )
        dead_stock_count = sum(1 for p in products if p.stock_quantity > 0 and p.id not in prods_with_sales)

        # ── Multi-Factor Weighted Scoring ─────────────────────────────────
        # Weight 1: Collection & Aging (25%)
        positive_factors: List[ReasonCodeDetail] = []
        risk_factors: List[ReasonCodeDetail] = []
        recommendations: List[str] = []

        if total_receivables == Decimal("0.00"):
            score_collection = Decimal("95.0")
            positive_factors.append(ReasonCodeDetail(
                code="ZERO_DELINQUENT_DEBTORS",
                category="Credit Risk",
                weight="25%",
                description="Zero overdue customer receivables. The enterprise operates primarily on immediate settlements."
            ))
        elif delinquent_ratio_pct <= Decimal("10.0"):
            score_collection = Decimal("88.0")
            positive_factors.append(ReasonCodeDetail(
                code="HEALTHY_COLLECTION_CYCLE",
                category="Credit Risk",
                weight="25%",
                description=f"Overdue receivables ratio is low ({delinquent_ratio_pct}% of total receivables)."
            ))
        elif delinquent_ratio_pct <= Decimal("30.0"):
            score_collection = Decimal("65.0")
            risk_factors.append(ReasonCodeDetail(
                code="MODERATE_OVERDUE_RECEIVABLES",
                category="Credit Risk",
                weight="25%",
                description=f"Moderate overdue customer balance ({delinquent_ratio_pct}% older than 60 days)."
            ))
            recommendations.append("Accelerate collection of accounts receivable older than 60 days to reduce default risk.")
        else:
            score_collection = Decimal("35.0")
            risk_factors.append(ReasonCodeDetail(
                code="HIGH_DELINQUENT_RECEIVABLES",
                category="Credit Risk",
                weight="25%",
                description=f"High proportion of severely overdue receivables ({delinquent_ratio_pct}% older than 60 days)."
            ))
            recommendations.append("Implement strict credit terms and follow up on delinquent customer invoices immediately.")

        # Weight 2: Operating Cash Flow & Margin (25%)
        if total_revenue_30d == Decimal("0.00"):
            score_cashflow = Decimal("40.0")
            risk_factors.append(ReasonCodeDetail(
                code="INSUFFICIENT_RECENT_REVENUE",
                category="Cash Flow",
                weight="25%",
                description="No completed sales recorded in the past 30 days."
            ))
            recommendations.append("Generate verifiable sales records to establish a rolling revenue baseline.")
        elif operating_margin_pct >= Decimal("20.0"):
            score_cashflow = Decimal("95.0")
            positive_factors.append(ReasonCodeDetail(
                code="STRONG_OPERATING_MARGIN",
                category="Cash Flow",
                weight="25%",
                description=f"Healthy operating profit margin of {operating_margin_pct}% over the rolling 30-day window."
            ))
        elif operating_margin_pct >= Decimal("10.0"):
            score_cashflow = Decimal("80.0")
            positive_factors.append(ReasonCodeDetail(
                code="STABLE_OPERATING_MARGIN",
                category="Cash Flow",
                weight="25%",
                description=f"Stable positive operating margin of {operating_margin_pct}%."
            ))
        elif operating_margin_pct >= Decimal("0.0"):
            score_cashflow = Decimal("60.0")
            risk_factors.append(ReasonCodeDetail(
                code="SLIM_OPERATING_MARGIN",
                category="Cash Flow",
                weight="25%",
                description=f"Slim operating margin of {operating_margin_pct}%. Revenue closely matches operational overhead."
            ))
            recommendations.append("Optimize operating overheads or procurement costs to widen net profit buffer.")
        else:
            score_cashflow = Decimal("30.0")
            risk_factors.append(ReasonCodeDetail(
                code="NEGATIVE_OPERATING_CASHFLOW",
                category="Cash Flow",
                weight="25%",
                description=f"Operating deficit detected. Expenses exceeded revenue by ₹{abs(net_operating_cashflow_30d)} in the past 30 days."
            ))
            recommendations.append("Curtail non-essential operational expenditures to restore positive operating cash flow.")

        # Weight 3: Revenue Stability & Transaction Velocity (20%)
        if sales_count_30d >= 20:
            score_revenue = Decimal("95.0")
            positive_factors.append(ReasonCodeDetail(
                code="HIGH_TRANSACTION_VELOCITY",
                category="Business Stability",
                weight="20%",
                description=f"Robust sales frequency with {sales_count_30d} orders processed in the past 30 days."
            ))
        elif sales_count_30d >= 10:
            score_revenue = Decimal("80.0")
            positive_factors.append(ReasonCodeDetail(
                code="CONSISTENT_ORDER_FLOW",
                category="Business Stability",
                weight="20%",
                description=f"Consistent commercial activity with {sales_count_30d} completed sales orders."
            ))
        elif sales_count_30d >= 3:
            score_revenue = Decimal("60.0")
            risk_factors.append(ReasonCodeDetail(
                code="MODEST_TRANSACTION_VOLUME",
                category="Business Stability",
                weight="20%",
                description=f"Moderate transaction count ({sales_count_30d} orders in 30 days)."
            ))
        else:
            score_revenue = Decimal("40.0")
            risk_factors.append(ReasonCodeDetail(
                code="LOW_TRANSACTION_COUNT",
                category="Business Stability",
                weight="20%",
                description=f"Limited order frequency ({sales_count_30d} transactions recorded)."
            ))

        # Weight 4: Expense-to-Revenue Coverage (15%)
        if total_revenue_30d > Decimal("0.00"):
            expense_ratio = total_expenses_30d / total_revenue_30d
            if expense_ratio <= Decimal("0.70"):
                score_coverage = Decimal("95.0")
                positive_factors.append(ReasonCodeDetail(
                    code="OPTIMAL_COST_COVERAGE",
                    category="Debt Service",
                    weight="15%",
                    description=f"Expenses represent {round_money(expense_ratio * 100)}% of revenue, leaving substantial debt servicing capacity."
                ))
            elif expense_ratio <= Decimal("0.90"):
                score_coverage = Decimal("80.0")
                positive_factors.append(ReasonCodeDetail(
                    code="ADEQUATE_COST_COVERAGE",
                    category="Debt Service",
                    weight="15%",
                    description=f"Expense-to-revenue ratio of {round_money(expense_ratio * 100)}%."
                ))
            elif expense_ratio <= Decimal("1.00"):
                score_coverage = Decimal("60.0")
                risk_factors.append(ReasonCodeDetail(
                    code="TIGHT_DEBT_CAPACITY",
                    category="Debt Service",
                    weight="15%",
                    description="Expenditures absorb over 90% of business revenues."
                ))
            else:
                score_coverage = Decimal("30.0")
                risk_factors.append(ReasonCodeDetail(
                    code="EXPENDITURES_EXCEED_REVENUE",
                    category="Debt Service",
                    weight="15%",
                    description="Total expenses exceeded revenues over the 30-day evaluation period."
                ))
        else:
            score_coverage = Decimal("50.0")

        # Weight 5: Inventory Health & Working Capital Liquidity (15%)
        if dead_stock_count == 0 and total_prods > 0:
            score_inventory = Decimal("90.0")
            positive_factors.append(ReasonCodeDetail(
                code="ZERO_DEAD_STOCK",
                category="Asset Quality",
                weight="15%",
                description="Zero idle/dead inventory detected. All stocked items have active turnover."
            ))
        elif dead_stock_count <= 2:
            score_inventory = Decimal("75.0")
            positive_factors.append(ReasonCodeDetail(
                code="CONTROLLED_INVENTORY_RISK",
                category="Asset Quality",
                weight="15%",
                description=f"Minimal idle stock ({dead_stock_count} item(s) without recent sales)."
            ))
        else:
            score_inventory = Decimal("50.0")
            risk_factors.append(ReasonCodeDetail(
                code="IDLE_INVENTORY_CAPITAL",
                category="Asset Quality",
                weight="15%",
                description=f"{dead_stock_count} products have non-moving stock, tying up working capital."
            ))
            recommendations.append("Liquidate or discount slow-moving inventory to release trapped working capital.")

        # Composite Score Calculation
        composite_score = (
            (score_collection * Decimal("0.25")) +
            (score_cashflow * Decimal("0.25")) +
            (score_revenue * Decimal("0.20")) +
            (score_coverage * Decimal("0.15")) +
            (score_inventory * Decimal("0.15"))
        )
        final_score = round_money(composite_score)

        # Risk Tier and Grade classification
        if final_score >= Decimal("80.00"):
            risk_tier = "LOW_RISK"
            grade = "A"
            summary = "Strong operational health, positive cash flow, and healthy debt service viability."
        elif final_score >= Decimal("65.00"):
            risk_tier = "MODERATE_RISK"
            grade = "B"
            summary = "Acceptable operational stability with manageable working capital overheads."
        elif final_score >= Decimal("50.00"):
            risk_tier = "ELEVATED_RISK"
            grade = "C"
            summary = "Moderate financial volatility or working capital strain. Collateral or guarantor advised."
        else:
            risk_tier = "HIGH_RISK"
            grade = "D"
            summary = "Significant cash flow deficit or delinquent receivables posing elevated credit risk."

        if not recommendations:
            recommendations.append("Maintain current operational consistency and debtor collection schedules.")

        metrics_obj = RiskMetricsSnapshot(
            total_revenue_30d=total_revenue_30d,
            total_expenses_30d=total_expenses_30d,
            net_operating_cashflow_30d=net_operating_cashflow_30d,
            operating_profit_margin_pct=operating_margin_pct,
            total_receivables=total_receivables,
            overdue_receivables_60d_plus=overdue_60d_plus,
            delinquent_ratio_pct=delinquent_ratio_pct,
            sales_transactions_count_30d=Decimal(str(sales_count_30d)),
            inventory_turnover_ratio=inv_turnover,
            dead_stock_count=dead_stock_count,
        )

        # Persist score in database
        eval_record = EnterpriseRiskScore(
            tenant_id=tenant_id,
            score=final_score,
            risk_tier=risk_tier,
            grade=grade,
            metrics_snapshot=metrics_obj.model_dump_json(),
            positive_factors=json.dumps([f.model_dump() for f in positive_factors]),
            risk_factors=json.dumps([f.model_dump() for f in risk_factors]),
            recommendations=json.dumps(recommendations),
            method_version=METHOD_VERSION,
            evaluated_by_id=evaluator.id if evaluator else None,
            created_at=now,
        )
        db.add(eval_record)

        # Audit log entry
        audit_log = AuditLog(
            tenant_id=tenant_id,
            user_id=evaluator.id if evaluator else None,
            actor_name=evaluator.full_name if evaluator else "System",
            action="CREDIT_RISK_EVALUATION",
            entity_type="ENTERPRISE",
            entity_id=tenant_id,
            details=json.dumps({"score": str(final_score), "grade": grade, "risk_tier": risk_tier}),
            timestamp=now,
        )
        db.add(audit_log)
        db.commit()
        db.refresh(eval_record)

        evaluator_name = evaluator.full_name if evaluator else "System Automated"

        return CreditRiskEvaluationResponse(
            id=eval_record.id,
            tenant_id=tenant_id,
            score=final_score,
            risk_tier=risk_tier,
            grade=grade,
            summary=summary,
            metrics=metrics_obj,
            positive_factors=positive_factors,
            risk_factors=risk_factors,
            recommendations=recommendations,
            method_version=METHOD_VERSION,
            evaluated_at=now.isoformat(),
            evaluated_by=evaluator_name,
            disclaimer=BANKING_DISCLAIMER,
        )

    @staticmethod
    def get_latest_risk_score(db: Session, tenant_id: str) -> Optional[CreditRiskEvaluationResponse]:
        record = db.query(EnterpriseRiskScore).filter(
            EnterpriseRiskScore.tenant_id == tenant_id
        ).order_by(desc(EnterpriseRiskScore.created_at)).first()

        if not record:
            return None

        metrics_data = json.loads(record.metrics_snapshot)
        positive_data = [ReasonCodeDetail(**f) for f in json.loads(record.positive_factors)]
        risk_data = [ReasonCodeDetail(**f) for f in json.loads(record.risk_factors)]
        recommendations = json.loads(record.recommendations)

        evaluator_name = record.evaluator.full_name if record.evaluator else "System Automated"

        summary = "Operational credit assessment based on financial ledger and debtor metrics."
        if record.grade == "A":
            summary = "Strong operational health, positive cash flow, and healthy debt service viability."
        elif record.grade == "B":
            summary = "Acceptable operational stability with manageable working capital overheads."
        elif record.grade == "C":
            summary = "Moderate financial volatility or working capital strain. Collateral or guarantor advised."
        elif record.grade == "D":
            summary = "Significant cash flow deficit or delinquent receivables posing elevated credit risk."

        return CreditRiskEvaluationResponse(
            id=record.id,
            tenant_id=record.tenant_id,
            score=record.score,
            risk_tier=record.risk_tier,
            grade=record.grade,
            summary=summary,
            metrics=RiskMetricsSnapshot(**metrics_data),
            positive_factors=positive_data,
            risk_factors=risk_data,
            recommendations=recommendations,
            method_version=record.method_version,
            evaluated_at=record.created_at.isoformat(),
            evaluated_by=evaluator_name,
            disclaimer=BANKING_DISCLAIMER,
        )

    @staticmethod
    def get_score_history(db: Session, tenant_id: str, limit: int = 10) -> List[CreditRiskHistoryItem]:
        records = db.query(EnterpriseRiskScore).filter(
            EnterpriseRiskScore.tenant_id == tenant_id
        ).order_by(desc(EnterpriseRiskScore.created_at)).limit(limit).all()

        return [
            CreditRiskHistoryItem(
                id=r.id,
                score=r.score,
                risk_tier=r.risk_tier,
                grade=r.grade,
                evaluated_at=r.created_at.isoformat(),
                method_version=r.method_version,
            )
            for r in records
        ]

credit_risk_service = CreditRiskService()
