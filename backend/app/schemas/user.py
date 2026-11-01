# app/schemas/user.py
import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)
    full_name: str | None = None
    # Code emailed by the OTP microservice and verified before the account is created.
    otp: str = Field(..., min_length=4, max_length=8)

class UserLogin(BaseModel):
    email: EmailStr
    password: str


class SendOtpRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=4, max_length=8)
    new_password: str = Field(..., min_length=8, max_length=72)


class GoogleAuthRequest(BaseModel):
    """OAuth2 access token obtained by `useGoogleLogin` on the frontend."""
    access_token: str = Field(..., min_length=10)


class UserRead(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str | None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

