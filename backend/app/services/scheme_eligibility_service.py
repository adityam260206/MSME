import json
from decimal import Decimal
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from backend.app.models.scheme import Scheme, SchemeAssessment
from backend.app.models.audit_log import AuditLog
from backend.app.schemas.scheme import (
    SchemeDetailResponse, CriterionEvaluationItem, SchemeAssessmentResult,
    SchemeAssessmentRequest, SchemeAssessmentSummaryResponse
)

SCHEME_DISCLAIMER = (
    "DISCLAIMER: Scheme eligibility results are diagnostic assessments based on documented criteria "
    "published by government ministries and developmental financial institutions. Actual loan sanction, "
    "subsidy disbursement, and final underwriting approval depend entirely on formal application submission, "
    "KYC verification, and credit evaluation by participating member lending institutions (MLIs) / banks."
)

DEFAULT_OFFICIAL_SCHEMES = [
    {
        "scheme_code": "CGTMSE",
        "name": "Credit Guarantee Fund Trust for Micro and Small Enterprises (CGTMSE)",
        "category": "Credit Guarantee",
        "description": "Provides collateral-free financial support to Micro and Small Enterprises up to ₹5 Crore through credit guarantees backed by SIDBI and Ministry of MSME.",
        "max_funding_amount": Decimal("50000000.00"),  # 5 Crore
        "interest_rate_subsidy_pct": Decimal("0.00"),
        "collateral_required": False,
        "min_vintage_years": 0,
        "target_enterprise_types": "MICRO,SMALL",
        "criteria_json": json.dumps([
            {"key": "category", "label": "Enterprise Classification", "operator": "in", "values": ["MICRO", "SMALL"]},
            {"key": "loan_amount", "label": "Maximum Facility Limit", "operator": "lte", "value": 50000000},
            {"key": "sector", "label": "Eligible Economic Sector", "operator": "in", "values": ["MANUFACTURING", "SERVICES", "TRADING"]},
        ]),
        "required_documents": json.dumps([
            "Udyam Registration Certificate",
            "Project Report / Business Plan",
            "Past 2 Years ITR / Financial Statements (or 1 year for new units)",
            "Bank Account Statement (Past 6 months)"
        ]),
        "official_portal_url": "https://www.cgtmse.in",
        "verified_date": "2026-10-15",
    },
    {
        "scheme_code": "PMMY_MUDRA",
        "name": "Pradhan Mantri MUDRA Yojana (PMMY)",
        "category": "Micro-Loan",
        "description": "Offers institutional credit up to ₹20 Lakhs for non-corporate, non-farm micro and small enterprises across Shishu (up to ₹50k), Kishore (₹50k-₹5L), and Tarun (₹5L-₹20L) tiers.",
        "max_funding_amount": Decimal("2000000.00"),  # 20 Lakhs
        "interest_rate_subsidy_pct": Decimal("0.00"),
        "collateral_required": False,
        "min_vintage_years": 0,
        "target_enterprise_types": "MICRO,SMALL",
        "criteria_json": json.dumps([
            {"key": "category", "label": "Enterprise Classification", "operator": "in", "values": ["MICRO", "SMALL"]},
            {"key": "loan_amount", "label": "Maximum MUDRA Facility", "operator": "lte", "value": 2000000},
        ]),
        "required_documents": json.dumps([
            "Proof of Identity (Aadhaar / Voter ID / PAN)",
            "Proof of Business Address",
            "Quotation of Machinery / Equipment to be purchased",
            "Udyam Registration Certificate"
        ]),
        "official_portal_url": "https://www.mudra.org.in",
        "verified_date": "2026-10-15",
    },
    {
        "scheme_code": "PMEGP",
        "name": "Prime Minister's Employment Generation Programme (PMEGP)",
        "category": "Capital Subsidy",
        "description": "Credit-linked capital subsidy scheme administered by KVIC offering 15% to 35% margin money subsidy on project loans up to ₹50 Lakhs for manufacturing and ₹20 Lakhs for service units.",
        "max_funding_amount": Decimal("5000000.00"),  # 50 Lakhs
        "interest_rate_subsidy_pct": Decimal("15.00"),  # 15-35% subsidy
        "collateral_required": False,
        "min_vintage_years": 0,
        "target_enterprise_types": "MICRO",
        "criteria_json": json.dumps([
            {"key": "category", "label": "Enterprise Classification", "operator": "in", "values": ["MICRO"]},
            {"key": "loan_amount", "label": "Project Cost Ceiling", "operator": "lte", "value": 5000000},
            {"key": "sector", "label": "Industry Domain", "operator": "in", "values": ["MANUFACTURING", "SERVICES"]},
        ]),
        "required_documents": json.dumps([
            "Detailed Project Report (DPR)",
            "Aadhaar Card & Educational Qualification Certificate",
            "Special Category Certificate (if SC/ST/OBC/Women)",
            "EDP Training Certificate (prior to subsidy release)"
        ]),
        "official_portal_url": "https://www.kviconline.gov.in/pmegp",
        "verified_date": "2026-10-15",
    },
    {
        "scheme_code": "STAND_UP_INDIA",
        "name": "Stand-Up India Scheme for Women and SC/ST Entrepreneurs",
        "category": "Special Category Lending",
        "description": "Facilitates bank credit between ₹10 Lakhs and ₹1 Crore to at least one SC/ST borrower and at least one Woman borrower per bank branch for setting up greenfield enterprises.",
        "max_funding_amount": Decimal("10000000.00"),  # 1 Crore
        "interest_rate_subsidy_pct": Decimal("0.00"),
        "collateral_required": False,
        "min_vintage_years": 0,
        "target_enterprise_types": "MICRO,SMALL,MEDIUM",
        "criteria_json": json.dumps([
            {"key": "ownership", "label": "Ownership Demographic", "operator": "in", "values": ["WOMAN_ENTREPRENEUR", "SC_ST"]},
            {"key": "loan_amount_min", "label": "Minimum Facility Amount", "operator": "gte", "value": 1000000},
            {"key": "loan_amount_max", "label": "Maximum Facility Amount", "operator": "lte", "value": 10000000},
            {"key": "is_greenfield", "label": "Greenfield Project Status", "operator": "eq", "value": True},
        ]),
        "required_documents": json.dumps([
            "Proof of SC/ST or Woman Entrepreneur Ownership (>= 51% equity)",
            "Project Proposal for Greenfield Venture",
            "Pollution Clearance / NOC where applicable",
            "Udyam Registration"
        ]),
        "official_portal_url": "https://www.standupmitra.in",
        "verified_date": "2026-10-15",
    },
    {
        "scheme_code": "INTEREST_SUBVENTION",
        "name": "2% Interest Subvention Scheme for Incremental Credit to MSMEs",
        "category": "Interest Subvention",
        "description": "Provides an upfront 2% per annum interest relief on fresh or incremental working capital or term loan facilities for all GST-registered MSMEs.",
        "max_funding_amount": Decimal("10000000.00"),  # 1 Crore
        "interest_rate_subsidy_pct": Decimal("2.00"),
        "collateral_required": False,
        "min_vintage_years": 1,
        "target_enterprise_types": "MICRO,SMALL,MEDIUM",
        "criteria_json": json.dumps([
            {"key": "gst_registered", "label": "Active GSTIN Registration", "operator": "eq", "value": True},
            {"key": "category", "label": "Enterprise Classification", "operator": "in", "values": ["MICRO", "SMALL", "MEDIUM"]},
            {"key": "vintage_years", "label": "Minimum Operating History", "operator": "gte", "value": 1},
        ]),
        "required_documents": json.dumps([
            "Valid GST Registration Certificate (GSTIN)",
            "Udyam Registration Number (URN)",
            "Existing Bank Loan Account Statement",
            "Chartered Accountant Certificate of Incremental Working Capital"
        ]),
        "official_portal_url": "https://rbi.org.in",
        "verified_date": "2026-10-15",
    },
    {
        "scheme_code": "CLCSS_TECH",
        "name": "Credit Linked Capital Subsidy Scheme (CLCSS)",
        "category": "Technology Modernization",
        "description": "Provides 15% upfront capital subsidy (up to ₹15 Lakhs on maximum ₹1 Crore institutional finance) for technology modernization in approved manufacturing sub-sectors.",
        "max_funding_amount": Decimal("10000000.00"),  # 1 Crore
        "interest_rate_subsidy_pct": Decimal("15.00"),
        "collateral_required": False,
        "min_vintage_years": 1,
        "target_enterprise_types": "MICRO,SMALL",
        "criteria_json": json.dumps([
            {"key": "sector", "label": "Manufacturing Domain", "operator": "in", "values": ["MANUFACTURING"]},
            {"key": "category", "label": "Enterprise Classification", "operator": "in", "values": ["MICRO", "SMALL"]},
            {"key": "vintage_years", "label": "Operating Experience", "operator": "gte", "value": 1},
            {"key": "loan_amount", "label": "Ceiling on Eligible Equipment Loan", "operator": "lte", "value": 10000000},
        ]),
        "required_documents": json.dumps([
            "Technical Report on Plant & Machinery Modernization",
            "Supplier Invoices / Proforma for Machinery",
            "Udyam Certificate",
            "Audited Balance Sheets (Past 2 Years)"
        ]),
        "official_portal_url": "https://msme.gov.in",
        "verified_date": "2026-10-15",
    }
]

class SchemeEligibilityService:
    @staticmethod
    def ensure_default_schemes_seeded(db: Session):
        """Seed verified official government schemes if table is empty."""
        count = db.query(Scheme).count()
        if count == 0:
            for s_data in DEFAULT_OFFICIAL_SCHEMES:
                scheme = Scheme(
                    scheme_code=s_data["scheme_code"],
                    name=s_data["name"],
                    category=s_data["category"],
                    description=s_data["description"],
                    max_funding_amount=s_data["max_funding_amount"],
                    interest_rate_subsidy_pct=s_data["interest_rate_subsidy_pct"],
                    collateral_required=s_data["collateral_required"],
                    min_vintage_years=s_data["min_vintage_years"],
                    target_enterprise_types=s_data["target_enterprise_types"],
                    criteria_json=s_data["criteria_json"],
                    required_documents=s_data["required_documents"],
                    official_portal_url=s_data["official_portal_url"],
                    verified_date=s_data["verified_date"],
                    is_active=True,
                )
                db.add(scheme)
            db.commit()

    @staticmethod
    def list_all_schemes(db: Session) -> List[SchemeDetailResponse]:
        SchemeEligibilityService.ensure_default_schemes_seeded(db)
        schemes = db.query(Scheme).filter(Scheme.is_active == True).all()

        results = []
        for s in schemes:
            results.append(
                SchemeDetailResponse(
                    id=s.id,
                    scheme_code=s.scheme_code,
                    name=s.name,
                    category=s.category,
                    description=s.description,
                    max_funding_amount=s.max_funding_amount,
                    interest_rate_subsidy_pct=s.interest_rate_subsidy_pct,
                    collateral_required=s.collateral_required,
                    min_vintage_years=s.min_vintage_years,
                    target_enterprise_types=s.target_enterprise_types.split(","),
                    required_documents=json.loads(s.required_documents),
                    official_portal_url=s.official_portal_url,
                    verified_date=s.verified_date,
                    is_active=s.is_active,
                )
            )
        return results

    @staticmethod
    def evaluate_eligibility(
        db: Session,
        tenant_id: str,
        req: SchemeAssessmentRequest,
        evaluator_id: Optional[str] = None
    ) -> SchemeAssessmentSummaryResponse:
        SchemeEligibilityService.ensure_default_schemes_seeded(db)
        schemes = db.query(Scheme).filter(Scheme.is_active == True).all()
        now = datetime.now(timezone.utc)

        eval_results: List[SchemeAssessmentResult] = []
        eligible_count = 0
        ineligible_count = 0
        insufficient_info_count = 0

        for s in schemes:
            criteria_rules = json.loads(s.criteria_json)
            checklist: List[CriterionEvaluationItem] = []
            unmet_list: List[str] = []
            missing_list: List[str] = []

            for rule in criteria_rules:
                key = rule["key"]
                label = rule["label"]
                op = rule["operator"]

                satisfied = False
                missing = False
                actual_str = ""
                explanation = ""

                if key == "category":
                    actual_str = req.enterprise_category.upper()
                    target_cats = rule["values"]
                    satisfied = actual_str in target_cats
                    req_str = f"Must be in {', '.join(target_cats)}"
                    explanation = f"Enterprise is classified as {actual_str}."

                elif key == "loan_amount" or key == "loan_amount_max":
                    max_amt = Decimal(str(rule["value"]))
                    actual_str = f"₹{req.desired_loan_amount:,.2f}"
                    satisfied = req.desired_loan_amount <= max_amt
                    req_str = f"Facility required must not exceed ₹{max_amt:,.2f}"
                    explanation = f"Requested loan is {actual_str} vs max eligible {req_str}."

                elif key == "loan_amount_min":
                    min_amt = Decimal(str(rule["value"]))
                    actual_str = f"₹{req.desired_loan_amount:,.2f}"
                    satisfied = req.desired_loan_amount >= min_amt
                    req_str = f"Minimum facility must be at least ₹{min_amt:,.2f}"
                    explanation = f"Requested loan is {actual_str} vs minimum required {req_str}."

                elif key == "sector":
                    actual_str = req.industry_sector.upper()
                    target_sectors = rule["values"]
                    satisfied = actual_str in target_sectors
                    req_str = f"Industry sector must be in {', '.join(target_sectors)}"
                    explanation = f"Enterprise operates in {actual_str} sector."

                elif key == "vintage_years":
                    min_v = int(rule["value"])
                    actual_str = f"{req.vintage_years} year(s)"
                    satisfied = req.vintage_years >= min_v
                    req_str = f"Minimum operating vintage: {min_v} year(s)"
                    explanation = f"Business has been operational for {actual_str}."

                elif key == "gst_registered":
                    actual_str = "Yes" if req.gst_registered else "No"
                    satisfied = (req.gst_registered == rule["value"])
                    req_str = "Must have an active GST Registration"
                    explanation = f"GSTIN status: {actual_str}."

                elif key == "ownership":
                    actual_str = req.ownership_category.upper()
                    target_ownership = rule["values"]
                    satisfied = actual_str in target_ownership
                    req_str = f"Ownership must be {', '.join(target_ownership)}"
                    explanation = f"Current ownership profile is {actual_str}."

                elif key == "is_greenfield":
                    actual_str = "Greenfield (New Setup)" if req.is_greenfield else "Existing Operation"
                    satisfied = (req.is_greenfield == rule["value"])
                    req_str = "Must be a Greenfield project setup"
                    explanation = f"Project classification is {actual_str}."

                else:
                    missing = True
                    actual_str = "Information Not Provided"
                    req_str = label
                    explanation = "Missing enterprise parameter for evaluation."

                if not satisfied and not missing:
                    unmet_list.append(f"{label}: {explanation} ({req_str})")
                if missing:
                    missing_list.append(label)

                checklist.append(
                    CriterionEvaluationItem(
                        criterion_name=label,
                        requirement=req_str,
                        actual_value=actual_str,
                        is_satisfied=satisfied,
                        is_missing_info=missing,
                        explanation=explanation,
                    )
                )

            # Determine verdict
            total_conditions = len(checklist)
            met_conditions = sum(1 for c in checklist if c.is_satisfied)

            if missing_list:
                status = "INSUFFICIENT_DATA"
                summary_verdict = f"Insufficient data: {len(missing_list)} criteria require additional enterprise inputs."
                insufficient_info_count += 1
            elif met_conditions == total_conditions:
                status = "POTENTIALLY_ELIGIBLE"
                summary_verdict = "All documented statutory conditions appear satisfied for this scheme."
                eligible_count += 1
            else:
                status = "INELIGIBLE"
                summary_verdict = f"Does not meet {len(unmet_list)} mandatory scheme condition(s)."
                ineligible_count += 1

            eval_results.append(
                SchemeAssessmentResult(
                    scheme_id=s.id,
                    scheme_code=s.scheme_code,
                    scheme_name=s.name,
                    category=s.category,
                    status=status,
                    max_funding_amount=s.max_funding_amount,
                    interest_rate_subsidy_pct=s.interest_rate_subsidy_pct,
                    collateral_required=s.collateral_required,
                    official_portal_url=s.official_portal_url,
                    checklist=checklist,
                    met_conditions_count=met_conditions,
                    total_conditions_count=total_conditions,
                    unmet_conditions=unmet_list,
                    missing_information=missing_list,
                    summary_verdict=summary_verdict,
                )
            )

        # Audit log entry
        audit_log = AuditLog(
            tenant_id=tenant_id,
            user_id=evaluator_id,
            actor_name="Enterprise User",
            action="SCHEME_ELIGIBILITY_EVALUATION",
            entity_type="SCHEMES",
            entity_id=tenant_id,
            details=json.dumps({"eligible": eligible_count, "ineligible": ineligible_count}),
            timestamp=now,
        )
        db.add(audit_log)
        db.commit()

        # Sort results: POTENTIALLY_ELIGIBLE first, then INSUFFICIENT_DATA, then INELIGIBLE
        priority_map = {"POTENTIALLY_ELIGIBLE": 0, "INSUFFICIENT_DATA": 1, "INELIGIBLE": 2}
        eval_results.sort(key=lambda x: priority_map.get(x.status, 3))

        return SchemeAssessmentSummaryResponse(
            tenant_id=tenant_id,
            evaluated_at=now.isoformat(),
            eligible_count=eligible_count,
            ineligible_count=ineligible_count,
            insufficient_info_count=insufficient_info_count,
            results=eval_results,
            legal_disclaimer=SCHEME_DISCLAIMER,
        )

scheme_eligibility_service = SchemeEligibilityService()
