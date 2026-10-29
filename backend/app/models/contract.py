# app/models/contract.py
from app.models.comon_import import *
from app.database import Base


class ContractStatus(str, enum.Enum):
    """Enum for the lifecycle of a contract."""
    uploaded = "uploaded"
    processing = "processing"   # Chunks being extracted
    processed = "processed"     # Chunks extracted, ready for analysis
    analyzing = "analyzing"     # LLM is reviewing risks
    analyzed = "analyzed"       # Risk analysis complete
    failed = "failed"


class Contract(Base):
    __tablename__ = "contracts"

    # 1. Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # 2. Foreign Key (Links to the User who uploaded it)
    user_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )

    # 3. File Metadata
    filename = Column(String, nullable=False)           # e.g., "Service_Agreement_v2.pdf"
    cloudinary_public_id = Column(String, nullable=False) # e.g., "contract_reviewer/abc123xyz"
    cloudinary_url = Column(String, nullable=False)       # e.g., "https://res.cloudinary.com/..."
    file_size = Column(Integer, nullable=True)    

    # 4. Status Tracking
    status = Column(
        SAEnum(ContractStatus), 
        default=ContractStatus.uploaded, 
        nullable=False
    )

    # 5. Timestamps
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    analyzed_at = Column(DateTime(timezone=True), nullable=True)

    # 6. Relationships (ORM Navigation)
    # "User" is a string to avoid circular imports.
    # cascade="all, delete-orphan" means if user is deleted, their contracts are deleted.
    user = relationship("User", back_populates="contracts")
    
    # A contract has many clauses, risk results, and chat messages
    clauses = relationship("Clause", back_populates="contract", cascade="all, delete-orphan")
    risk_results = relationship("RiskResult", back_populates="contract", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="contract", cascade="all, delete-orphan")