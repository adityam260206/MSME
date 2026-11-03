from decimal import Decimal
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class SchemeDetailResponse(BaseModel):
    id: str
    scheme_code: str
    name: str
    category: str
    description: str
    max_funding_amount: Decimal
    interest_rate_subsidy_pct: Decimal
    collateral_required: bool
    min_vintage_years: int
    target_enterprise_types: List[str]
    required_documents: List[str]
    official_portal_url: str
    verified_date: str
    is_active: bool

class CriterionEvaluationItem(BaseModel):
    criterion_name: str
    requirement: str
    actual_value: str
    is_satisfied: bool
    is_missing_info: bool = False
    explanation: str

class SchemeAssessmentResult(BaseModel):
    scheme_id: str
    scheme_code: str
    scheme_name: str
    category: str
    status: str  # POTENTIALLY_ELIGIBLE, INELIGIBLE, INSUFFICIENT_DATA
    max_funding_amount: Decimal
    interest_rate_subsidy_pct: Decimal
    collateral_required: bool
    official_portal_url: str
    checklist: List[CriterionEvaluationItem]
    met_conditions_count: int
    total_conditions_count: int
    unmet_conditions: List[str]
    missing_information: List[str]
    summary_verdict: str

class SchemeAssessmentRequest(BaseModel):
    enterprise_category: str = Field(default="MICRO", description="MICRO, SMALL, or MEDIUM")
    annual_turnover: Decimal = Field(default=Decimal("1500000.00"), description="Annual enterprise turnover in INR")
    vintage_years: int = Field(default=2, description="Years in business operation")
    desired_loan_amount: Decimal = Field(default=Decimal("1000000.00"), description="Desired funding / loan in INR")
    ownership_category: str = Field(default="GENERAL", description="GENERAL, WOMAN_ENTREPRENEUR, SC_ST")
    gst_registered: bool = Field(default=True, description="Whether the enterprise has an active GSTIN")
    industry_sector: str = Field(default="MANUFACTURING", description="MANUFACTURING, SERVICES, TRADING")
    is_greenfield: bool = Field(default=False, description="Whether this is a brand new project setup")

class SchemeAssessmentSummaryResponse(BaseModel):
    tenant_id: str
    evaluated_at: str
    eligible_count: int
    ineligible_count: int
    insufficient_info_count: int
    results: List[SchemeAssessmentResult]
    legal_disclaimer: str
