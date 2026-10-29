# app/models/__init__.py
"""
Import every model module here so that a single `from app import models`
(used by alembic/env.py) registers all tables on `Base.metadata`.

Without these imports Alembic's `--autogenerate` sees empty metadata and would
try to DROP every table, so keep this list in sync with the model modules.
"""
from app.models.user import User
from app.models.contract import Contract, ContractStatus
from app.models.clause import Clause
from app.models.analysis import RiskResult, RiskLevel
from app.models.chat import ChatMessage, MessageRole

__all__ = [
    "User",
    "Contract",
    "ContractStatus",
    "Clause",
    "RiskResult",
    "RiskLevel",
    "ChatMessage",
    "MessageRole",
]
