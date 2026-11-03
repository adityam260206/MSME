from sqlalchemy import Column, String, DateTime, Numeric, Integer, Boolean, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.app.db.base import Base
from backend.app.models.tenant import generate_uuid, utc_now

class Scheme(Base):
    __tablename__ = "government_banking_schemes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    scheme_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)  # Credit Guarantee, Micro-Loan, Subsidy, etc.
    description = Column(Text, nullable=False)
    max_funding_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    interest_rate_subsidy_pct = Column(Numeric(5, 2), nullable=False, default=0.00)
    collateral_required = Column(Boolean, nullable=False, default=False)
    min_vintage_years = Column(Integer, nullable=False, default=0)
    target_enterprise_types = Column(String(255), nullable=False, default="MICRO,SMALL,MEDIUM")
    criteria_json = Column(Text, nullable=False)  # JSON specifications of criteria rules
    required_documents = Column(Text, nullable=False)  # JSON array of required doc names
    official_portal_url = Column(String(500), nullable=False)
    verified_date = Column(String(50), nullable=False, default="2026-10-15")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)

class SchemeAssessment(Base):
    __tablename__ = "scheme_assessments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    scheme_id = Column(String(36), ForeignKey("government_banking_schemes.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), nullable=False)  # POTENTIALLY_ELIGIBLE, INELIGIBLE, INSUFFICIENT_DATA
    criteria_checklist = Column(Text, nullable=False)  # JSON checklist of met vs unmet conditions
    enterprise_input_snapshot = Column(Text, nullable=False)  # JSON input used for evaluation
    evaluated_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=utc_now, index=True)

    tenant = relationship("Tenant")
    scheme = relationship("Scheme")
    evaluator = relationship("User")

    __table_args__ = (
        Index("ix_scheme_assessments_tenant", "tenant_id", "created_at"),
    )
