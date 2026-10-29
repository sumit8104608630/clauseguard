# app/schemas/contract.py
import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.contract import ContractStatus

# ==========================================
# OUTPUT SCHEMAS
# ==========================================

class ContractBase(BaseModel):
    id: uuid.UUID
    filename: str
    file_size: int | None = None
    status: ContractStatus
    uploaded_at: datetime
    analyzed_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

class ContractRead(ContractBase):
    """Used for the detail page"""
    cloudinary_url: str
    pass

class ContractListItem(ContractBase):
    """Lighter version for the dashboard list"""
    cloudinary_url: str | None = None
    user_id: uuid.UUID | None = None
    file_size: int | None = None
    filename: str | None = None
    uploaded_at: datetime | None = None
    pass

class ContractListResponse(BaseModel):
    items: list[ContractListItem]
    total: int
    page: int
    size: int