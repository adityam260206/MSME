from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field

class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str = Field(..., max_length=4000)

class AINavigationReference(BaseModel):
    label: str
    path: str

class AIChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="User prompt or question")
    history: Optional[List[ChatMessage]] = Field(default_factory=list, description="Recent conversation turns (up to 10)")

class AIChatResponse(BaseModel):
    reply: str
    source_modules: List[str] = Field(default_factory=list)
    intent: str
    references: List[AINavigationReference] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    execution_notes: Optional[str] = None

class AICopilotStatus(BaseModel):
    configured: bool
    model: str
    provider: str = "Groq"
    supported_roles: List[str] = Field(default_factory=lambda: ["ADMIN", "OWNER", "MANAGER", "STAFF"])
