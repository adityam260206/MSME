from sqlalchemy import Column, String, DateTime, Numeric, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.app.db.base import Base
from backend.app.models.tenant import generate_uuid, utc_now

class EnterpriseRiskScore(Base):
    __tablename__ = "enterprise_risk_scores"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    score = Column(Numeric(5, 2), nullable=False)  # 0.00 to 100.00
    risk_tier = Column(String(50), nullable=False)  # LOW_RISK, MODERATE_RISK, ELEVATED_RISK, HIGH_RISK
    grade = Column(String(10), nullable=False)  # A, B, C, D
    metrics_snapshot = Column(Text, nullable=False)  # JSON string of contributing metrics
    positive_factors = Column(Text, nullable=False)  # JSON array of strength reason descriptions
    risk_factors = Column(Text, nullable=False)  # JSON array of risk warnings & negative reason codes
    recommendations = Column(Text, nullable=False)  # JSON array of actionable recommendations
    method_version = Column(String(50), nullable=False, default="v1.0-msme-standard")
    evaluated_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=utc_now, index=True)

    tenant = relationship("Tenant")
    evaluator = relationship("User")

    __table_args__ = (
        Index("ix_risk_scores_tenant_created", "tenant_id", "created_at"),
    )
