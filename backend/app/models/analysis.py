# app/models/analysis.py
from app.models.comon_import import *
from app.database import Base

class RiskLevel(str, enum.Enum):
    high = "high"
    medium = "medium"
    low = "low"
    none = "none"

class RiskResult(Base):
    __tablename__ = "risk_results"

    # 1. Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # 2. Foreign Keys
    contract_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("contracts.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    
    # Links to the specific clause that triggered the risk. 
    # NULLABLE: If a category is analyzed but no risk is found, this is None.
    clause_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("clauses.id", ondelete="SET NULL"), 
        nullable=True
    )

    # 3. Analysis Data
    category = Column(String, nullable=False)         # e.g., "Indemnification", "Termination"
    risk_level = Column(SAEnum(RiskLevel), nullable=False, index=True)
    explanation = Column(Text, nullable=False)        # Plain English explanation
    suggested_fix = Column(Text, nullable=True)       # Safer wording suggestion
    confidence = Column(Float, nullable=False)        # 0.0 to 1.0 (from retrieval score)

    # 4. Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # 5. Relationships
    contract = relationship("Contract", back_populates="risk_results")
    clause = relationship("Clause") # We can access the original clause text via risk.clause.text