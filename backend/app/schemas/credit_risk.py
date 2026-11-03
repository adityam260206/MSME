from decimal import Decimal
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class RiskMetricsSnapshot(BaseModel):
    total_revenue_30d: Decimal
    total_expenses_30d: Decimal
    net_operating_cashflow_30d: Decimal
    operating_profit_margin_pct: Decimal
    total_receivables: Decimal
    overdue_receivables_60d_plus: Decimal
    delinquent_ratio_pct: Decimal
    sales_transactions_count_30d: Decimal
    inventory_turnover_ratio: Decimal
    dead_stock_count: int

class ReasonCodeDetail(BaseModel):
    code: str
    category: str
    weight: str
    description: str

class CreditRiskEvaluationResponse(BaseModel):
    id: str
    tenant_id: str
    score: Decimal
    risk_tier: str  # LOW_RISK, MODERATE_RISK, ELEVATED_RISK, HIGH_RISK
    grade: str      # A, B, C, D
    summary: str
    metrics: RiskMetricsSnapshot
    positive_factors: List[ReasonCodeDetail]
    risk_factors: List[ReasonCodeDetail]
    recommendations: List[str]
    method_version: str
    evaluated_at: str
    evaluated_by: Optional[str] = None
    disclaimer: str

class CreditRiskHistoryItem(BaseModel):
    id: str
    score: Decimal
    risk_tier: str
    grade: str
    evaluated_at: str
    method_version: str
