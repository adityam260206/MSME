from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.core.deps import require_roles
from backend.app.models.user import User
from backend.app.schemas.report import SalesReportRequest, SalesReportResponse
from backend.app.schemas.common import BaseResponse
from backend.app.services.report_service import generate_sales_report

router = APIRouter(prefix="/reports", tags=["Reports & Exports"])

@router.post("/sales")
def get_sales_report(
    req: SalesReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "OWNER", "MANAGER")),  # STAFF denied with 403
):
    result = generate_sales_report(db, current_user.tenant_id, req)
    if req.format == "csv":
        return Response(
            content=result,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=sales_report_{req.start_date}_to_{req.end_date}.csv"
            },
        )

    return BaseResponse(
        success=True,
        message="Sales report generated",
        data=result,
    )
