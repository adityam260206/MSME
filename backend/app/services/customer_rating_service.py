from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from backend.app.core.errors import AppException
from backend.app.models.customer import Customer
from backend.app.models.sale import Sale
from backend.app.models.customer_rating import CustomerFeedback
from backend.app.models.audit_log import AuditLog
from backend.app.schemas.customer_rating import (
    CustomerFeedbackCreate, CustomerFeedbackResponse, CustomerFeedbackSummary,
    CustomerReliabilityResponse
)

def round_money(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

class CustomerRatingService:
    @staticmethod
    def submit_feedback(
        db: Session,
        tenant_id: str,
        customer_id: str,
        data: CustomerFeedbackCreate,
        submitted_by_role: str = "CUSTOMER",
    ) -> CustomerFeedbackResponse:
        customer = db.query(Customer).filter(
            Customer.id == customer_id,
            Customer.tenant_id == tenant_id,
            Customer.is_active == True,
        ).first()
        if not customer:
            raise AppException(404, "Customer not found or inactive", "CUSTOMER_NOT_FOUND")

        invoice_no = None
        if data.sale_id:
            sale = db.query(Sale).filter(
                Sale.id == data.sale_id,
                Sale.tenant_id == tenant_id,
            ).first()
            if not sale:
                raise AppException(404, "Sale transaction not found", "SALE_NOT_FOUND")
            if sale.customer_id and sale.customer_id != customer_id:
                raise AppException(400, "This sale does not belong to the specified customer", "SALE_MISMATCH")

            # Prevent duplicate reviews on the same sale
            existing_fb = db.query(CustomerFeedback).filter(
                CustomerFeedback.sale_id == data.sale_id
            ).first()
            if existing_fb:
                raise AppException(
                    400,
                    "A customer feedback review has already been submitted for this invoice transaction",
                    "DUPLICATE_REVIEW",
                )
            invoice_no = sale.invoice_number

        feedback = CustomerFeedback(
            tenant_id=tenant_id,
            customer_id=customer_id,
            sale_id=data.sale_id,
            rating=data.rating,
            comment=data.comment.strip() if data.comment else None,
            submitted_by_role=submitted_by_role,
        )
        db.add(feedback)

        # Audit log
        audit = AuditLog(
            tenant_id=tenant_id,
            actor_name=customer.name,
            action="CUSTOMER_FEEDBACK_SUBMITTED",
            entity_type="CUSTOMER",
            entity_id=customer_id,
            details=f"Rating: {data.rating}/5 for sale {data.sale_id or 'general'}",
        )
        db.add(audit)
        db.commit()
        db.refresh(feedback)

        return CustomerFeedbackResponse(
            id=feedback.id,
            customer_id=feedback.customer_id,
            sale_id=feedback.sale_id,
            invoice_number=invoice_no,
            rating=feedback.rating,
            comment=feedback.comment,
            submitted_by_role=feedback.submitted_by_role,
            created_at=feedback.created_at.isoformat(),
        )

    @staticmethod
    def get_feedback_summary(
        db: Session,
        tenant_id: str,
        customer_id: str,
    ) -> CustomerFeedbackSummary:
        customer = db.query(Customer).filter(
            Customer.id == customer_id,
            Customer.tenant_id == tenant_id,
        ).first()
        if not customer:
            raise AppException(404, "Customer not found", "CUSTOMER_NOT_FOUND")

        reviews = db.query(CustomerFeedback).filter(
            CustomerFeedback.customer_id == customer_id,
            CustomerFeedback.tenant_id == tenant_id,
        ).order_by(desc(CustomerFeedback.created_at)).all()

        total = len(reviews)
        avg = Decimal("0.0")
        distribution = {"5_star": 0, "4_star": 0, "3_star": 0, "2_star": 0, "1_star": 0}

        if total > 0:
            sum_ratings = sum(r.rating for r in reviews)
            avg = round_money(Decimal(str(sum_ratings)) / Decimal(str(total)))
            for r in reviews:
                key = f"{r.rating}_star"
                if key in distribution:
                    distribution[key] += 1

        sale_ids = [r.sale_id for r in reviews if r.sale_id]
        sale_map = {}
        if sale_ids:
            sales = db.query(Sale.id, Sale.invoice_number).filter(Sale.id.in_(sale_ids)).all()
            sale_map = {s[0]: s[1] for s in sales}

        recent_items = [
            CustomerFeedbackResponse(
                id=r.id,
                customer_id=r.customer_id,
                sale_id=r.sale_id,
                invoice_number=sale_map.get(r.sale_id),
                rating=r.rating,
                comment=r.comment,
                submitted_by_role=r.submitted_by_role,
                created_at=r.created_at.isoformat(),
            )
            for r in reviews[:10]
        ]

        return CustomerFeedbackSummary(
            customer_id=customer.id,
            customer_name=customer.name,
            average_rating=avg,
            total_reviews=total,
            rating_distribution=distribution,
            recent_reviews=recent_items,
        )

    @staticmethod
    def calculate_reliability(
        db: Session,
        tenant_id: str,
        customer_id: str,
    ) -> CustomerReliabilityResponse:
        customer = db.query(Customer).filter(
            Customer.id == customer_id,
            Customer.tenant_id == tenant_id,
        ).first()
        if not customer:
            raise AppException(404, "Customer not found", "CUSTOMER_NOT_FOUND")

        now = datetime.now(timezone.utc)
        days_as_customer = max(1, (now - customer.created_at.replace(tzinfo=timezone.utc)).days)

        # All customer sales
        all_sales = db.query(Sale).filter(
            Sale.customer_id == customer_id,
            Sale.tenant_id == tenant_id,
        ).all()

        total_orders = len(all_sales)
        completed_orders = sum(1 for s in all_sales if s.status == "COMPLETED")
        cancelled_orders = sum(1 for s in all_sales if s.status == "CANCELLED")

        completion_rate = Decimal("100.00")
        if total_orders > 0:
            completion_rate = round_money((Decimal(str(completed_orders)) / Decimal(str(total_orders))) * Decimal("100.00"))

        lifetime_spent = customer.total_spent or Decimal("0.00")
        avg_order_val = Decimal("0.00")
        if completed_orders > 0:
            avg_order_val = round_money(lifetime_spent / Decimal(str(completed_orders)))

        # Reliability scoring model (0 to 100)
        # Factor 1: Order completion rate (40 points max)
        completion_points = (completion_rate / Decimal("100.00")) * Decimal("40.0")

        # Factor 2: Total spend volume (30 points max, scaled up to ₹1,00,000)
        spend_ratio = min(Decimal("1.0"), lifetime_spent / Decimal("100000.00"))
        spend_points = spend_ratio * Decimal("30.0")

        # Factor 3: Repeat transaction frequency (20 points max)
        freq_ratio = min(Decimal("1.0"), Decimal(str(completed_orders)) / Decimal("10.0"))
        freq_points = freq_ratio * Decimal("20.0")

        # Factor 4: Account vintage / loyalty (10 points max)
        vintage_ratio = min(Decimal("1.0"), Decimal(str(days_as_customer)) / Decimal("180.0"))
        vintage_points = vintage_ratio * Decimal("10.0")

        total_score = round_money(completion_points + spend_points + freq_points + vintage_points)

        factors: List[str] = []
        if total_orders < 2:
            tier = "NEW_CUSTOMER"
            summary = "New customer account with limited order history. Reliability tier will unlock after multiple transactions."
            factors.append("Account is in onboarding phase with fewer than 2 total transactions.")
        elif total_score >= Decimal("85.00"):
            tier = "PLATINUM"
            summary = "Top-tier enterprise client with excellent order completion and significant lifetime spend."
            factors.append(f"High order completion rate of {completion_rate}%.")
            factors.append(f"Substantial cumulative spend of ₹{lifetime_spent:,.2f}.")
            factors.append(f"Consistent transaction volume ({completed_orders} completed orders).")
        elif total_score >= Decimal("70.00"):
            tier = "GOLD"
            summary = "Highly reliable customer with steady repeat purchases and low cancellation frequency."
            factors.append(f"Reliable order completion rate ({completion_rate}%).")
            factors.append(f"Steady purchase history ({completed_orders} orders).")
        elif total_score >= Decimal("50.00"):
            tier = "SILVER"
            summary = "Standard customer account with moderate purchase history."
            factors.append("Moderate transaction frequency.")
            if cancelled_orders > 0:
                factors.append(f"{cancelled_orders} cancelled order(s) observed.")
        else:
            tier = "BRONZE"
            summary = "Higher cancellation frequency or low order activity observed."
            factors.append(f"Lower order completion rate ({completion_rate}%).")
            factors.append("Frequent cancellations or limited engagement.")

        return CustomerReliabilityResponse(
            customer_id=customer.id,
            customer_name=customer.name,
            reliability_score=total_score,
            reliability_tier=tier,
            total_orders_count=total_orders,
            completed_orders_count=completed_orders,
            cancelled_orders_count=cancelled_orders,
            completion_rate_pct=completion_rate,
            total_lifetime_spent=lifetime_spent,
            average_order_value=avg_order_val,
            days_as_customer=days_as_customer,
            reliability_summary=summary,
            contributing_factors=factors,
        )

customer_rating_service = CustomerRatingService()
