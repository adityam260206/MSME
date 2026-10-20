from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.deps import get_db, get_current_user
from backend.app.models.user import User
from backend.app.schemas.ai import AIChatRequest, AIChatResponse, AICopilotStatus
from backend.app.schemas.common import BaseResponse
from backend.app.services.ai_copilot_service import ai_copilot_service

router = APIRouter(prefix="/ai", tags=["AI Business Copilot"])

@router.get("/status", response_model=BaseResponse[AICopilotStatus])
def get_ai_status(current_user: User = Depends(get_current_user)):
    status = ai_copilot_service.get_status()
    return BaseResponse(
        success=True,
        message="AI Copilot status retrieved",
        data=status,
    )

@router.post("/chat", response_model=BaseResponse[AIChatResponse])
def chat_with_copilot(
    request: AIChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    response = ai_copilot_service.generate_reply(db, current_user, request)
    return BaseResponse(
        success=True,
        message="AI Copilot response generated",
        data=response,
    )
