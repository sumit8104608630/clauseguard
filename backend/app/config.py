
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

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        extra="ignore",
    )


settings = Settings()
