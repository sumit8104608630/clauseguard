# app/schemas/chat.py
import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.models.chat import MessageRole

# ==========================================
# INPUT SCHEMAS
# ==========================================

class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)

    @field_validator("question")
    @classmethod
    def strip_question(cls, value: str) -> str:
        """Trim padding, and reject a question that is only whitespace.

        `min_length=1` alone lets "   " through, which would otherwise reach
        retrieval and fail with a misleading "no clauses" message.
        """
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("question cannot be blank")
        return cleaned

# ==========================================
# OUTPUT SCHEMAS
# ==========================================

class ChatMessageRead(BaseModel):
    id: uuid.UUID
    role: MessageRole
    content: str
    cited_clause_ids: list[uuid.UUID] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
