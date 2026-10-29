# app/schemas/clause.py
import uuid
from pydantic import BaseModel, ConfigDict

class ClauseRead(BaseModel):
    id: uuid.UUID
    chunk_index: int
    section_label: str | None = None
    text: str
    token_count: int | None = None
    
    model_config = ConfigDict(from_attributes=True)