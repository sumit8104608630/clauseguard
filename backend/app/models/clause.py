# app/models/clause.py
from app.models.comon_import import *
from app.database import Base

class Clause(Base):
    __tablename__ = "clauses"

    # 1. Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # 2. Foreign Keys
    contract_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("contracts.id", ondelete="CASCADE"), 
        nullable=True, 
        index=True
    )

    # 3. Chunk Metadata
    chunk_index = Column(Integer, nullable=False)     # Order of the chunk in the document (0, 1, 2...)
    section_label = Column(String, nullable=True)     # e.g., "Section 4.2" (extracted during parsing)
    text = Column(Text, nullable=False)               # The actual chunk text
    
    # 4. Vector Store Link
    chroma_id = Column(String, nullable=False, unique=True) # ID of this chunk in ChromaDB
    
    # 5. Token Count (useful for calculating LLM context limits)
    token_count = Column(Integer, nullable=True)

    # 6. Relationship
    contract = relationship("Contract", back_populates="clauses")