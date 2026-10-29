## common imports
# app/models/common_imports.py
"""
Common imports ONLY for the models folder.
Import this at the top of every model file:
    from app.models.common_imports import *
"""

import uuid
import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Integer, BigInteger, Boolean, Float, Numeric, Text,
    DateTime, Date, ForeignKey, Index, UniqueConstraint,
    Enum as SAEnum, func
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy.orm import Session, relationship

__all__ = [
    # stdlib
    "uuid", "enum", "datetime", "timezone",
    # SQLAlchemy core
    "Column", "String", "Integer", "BigInteger", "Boolean", "Float", "Numeric", "Text",
    "DateTime", "Date", "ForeignKey", "Index", "UniqueConstraint",
    "SAEnum", "func",
    # PostgreSQL types
    "UUID", "ARRAY", "JSONB",
    # ORM
    "Session", "relationship",
]