# app/schemas/user.py
import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)
    full_name: str | None = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str



class UserRead(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str | None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

