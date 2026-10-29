# app/schemas/analysis.py
import uuid
from pydantic import BaseModel, Field, ConfigDict
from app.models.analysis import RiskLevel

# ==========================================
# LLM OUTPUT SCHEMA (Critical for Guardrails)
# ==========================================
class RiskResultLLM(BaseModel):
    """
    This is the exact JSON shape the LLM MUST return.
    We validate the LLM output against this before saving to DB.
    """
    risk_level: RiskLevel
    clause_id: uuid.UUID | None = None
    explanation: str = Field(..., max_length=1000)
    suggested_fix: str | None = None
    confidence: float = Field(..., ge=0.0, le=1.0)

# ==========================================
# API OUTPUT SCHEMAS
# ==========================================
class RiskResultRead(RiskResultLLM):
    """What the API returns to React"""
    id: uuid.UUID
    category: str

    model_config = ConfigDict(from_attributes=True)

class RiskScorecard(BaseModel):
    high: int
    medium: int
    low: int
    none: int

class AnalysisResponse(BaseModel):
    """The full payload returned when React asks for analysis results"""
    contract_id: uuid.UUID
    scorecard: RiskScorecard
    results: list[RiskResultRead]