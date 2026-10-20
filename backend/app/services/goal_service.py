from decimal import Decimal
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.models.goal import BusinessGoal
from backend.app.models.sale import Sale
from backend.app.schemas.goal import BusinessGoalCreate, BusinessGoalUpdate, BusinessGoalProgress

class GoalService:
    @staticmethod
    def get_goal(db: Session, tenant_id: str, target_month: str) -> Optional[BusinessGoal]:
        return db.query(BusinessGoal).filter(
            BusinessGoal.tenant_id == tenant_id,
            BusinessGoal.target_month == target_month,
        ).first()

    @staticmethod
    def set_goal(db: Session, tenant_id: str, data: BusinessGoalCreate) -> BusinessGoal:
        goal = GoalService.get_goal(db, tenant_id, data.target_month)
        if goal:
            goal.target_revenue = data.target_revenue
            goal.target_sales_volume = data.target_sales_volume
            goal.notes = data.notes
        else:
            goal = BusinessGoal(
                tenant_id=tenant_id,
                target_month=data.target_month,
                target_revenue=data.target_revenue,
                target_sales_volume=data.target_sales_volume,
                notes=data.notes,
            )
            db.add(goal)
        db.commit()
        db.refresh(goal)
        return goal

    @staticmethod
    def get_progress(db: Session, tenant_id: str, target_month: str) -> BusinessGoalProgress:
        goal = GoalService.get_goal(db, tenant_id, target_month)
        target_rev = Decimal(str(goal.target_revenue)) if goal else Decimal("0.00")
        target_vol = goal.target_sales_volume if goal else 0

        # Query actual completed sales for that month
        # target_month format: "YYYY-MM"
        sales = db.query(Sale).filter(
            Sale.tenant_id == tenant_id,
            Sale.status == "COMPLETED",
        ).all()

        actual_rev = Decimal("0.00")
        actual_vol = 0
        for s in sales:
            if s.created_at and s.created_at.strftime("%Y-%m") == target_month:
                actual_rev += Decimal(str(s.total_amount or 0.00))
                actual_vol += 1

        rev_rate = Decimal("0.00")
        if target_rev > 0:
            rev_rate = round((actual_rev / target_rev) * Decimal("100.00"), 2)

        vol_rate = Decimal("0.00")
        if target_vol > 0:
            vol_rate = round((Decimal(actual_vol) / Decimal(target_vol)) * Decimal("100.00"), 2)

        remaining_deficit = max(Decimal("0.00"), target_rev - actual_rev)

        return BusinessGoalProgress(
            target_month=target_month,
            target_revenue=target_rev,
            actual_revenue=actual_rev,
            revenue_achievement_rate=rev_rate,
            remaining_revenue_deficit=remaining_deficit,
            target_sales_volume=target_vol,
            actual_sales_volume=actual_vol,
            volume_achievement_rate=vol_rate,
            is_revenue_target_met=(actual_rev >= target_rev and target_rev > 0),
            is_volume_target_met=(actual_vol >= target_vol and target_vol > 0),
        )

goal_service = GoalService()
