
"""Pydantic Settings (environment variables)"""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/ directory
BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    DATABASE_URL: str
    GROQ_API_KEY: str
    # Groq retires models regularly (llama3-70b-8192 was decommissioned), so keep
    # this overridable from .env instead of hard-coding it at the call site.
    GROQ_MODEL: str = "openai/gpt-oss-120b"

    # --- external email/OTP microservice -------------------------------------
    OTP_SERVICE_URL: str = "https://otp-microservise.vercel.app"
    EMAIL_FROM: str | None = None

    # --- Google OAuth --------------------------------------------------------
    # Client id of the "web" OAuth client; the frontend uses the same value to
    # obtain the access token, we only need it to tag/lookup google accounts.
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000"

    # Public origin of the React app (used for links inside notification mail).
    FRONTEND_URL: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        extra="ignore",
    )


settings = Settings()
