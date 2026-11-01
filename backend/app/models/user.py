"""User table"""
import uuid

from app.models.comon_import import *
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    # Nullable because Google-only accounts never set a local password.
    password = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=True)
    # Google account id ("sub" claim); set when the user signs in with Google.
    google_id = Column(String(255), unique=True, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    contracts = relationship("Contract", back_populates="user")