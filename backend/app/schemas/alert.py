from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class AlertResponse(BaseModel):
    id: str
    tenant_id: str
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    alert_type: str  # LOW_STOCK, OUT_OF_STOCK
    severity: str    # WARNING, CRITICAL
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
