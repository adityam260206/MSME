from typing import Optional, Dict
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field

class FinancialTransactionCreate(BaseModel):
    type: str = Field(..., pattern="^(INCOME|EXPENSE)$")
    category: str = Field(..., min_length=1, max_length=100)
    amount: Decimal = Field(..., gt=0)
    description: str = Field(..., min_length=1, max_length=500)
    reference_id: Optional[str] = None

class FinancialTransactionResponse(BaseModel):
    id: str
    tenant_id: str
    type: str
    category: str
    amount: Decimal
    reference_id: Optional[str] = None
    description: str
    actor_id: Optional[str] = None
    is_reversed: bool
    reversed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class FinanceSummaryResponse(BaseModel):
    total_revenue: Decimal
    total_expenses: Decimal
    purchases_expense: Decimal
    gross_profit: Decimal
    net_profit: Decimal
    profit_margin_percent: Decimal
    receivables_total: Decimal
    payables_total: Decimal
    receivables_aging: Dict[str, Decimal] = {}
