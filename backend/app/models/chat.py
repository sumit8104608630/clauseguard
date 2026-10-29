# app/models/chat.py
from app.models.comon_import import *
from app.database import Base

class MessageRole(str, enum.Enum):
    user = "user"
    assistant = "assistant"

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    # 1. Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # 2. Foreign Keys
    contract_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("contracts.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    user_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE"), 
        nullable=False
    )

    # 3. Message Data
    role = Column(SAEnum(MessageRole), nullable=False)
    content = Column(Text, nullable=False)
    
    # 4. Citations (Array of UUIDs)
    # PostgreSQL ARRAY type allows us to store a list of clause IDs the AI referenced
    cited_clause_ids = Column(ARRAY(UUID(as_uuid=True)), default=list, nullable=False)

    # 5. Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # 6. Relationships
    contract = relationship("Contract", back_populates="chat_messages")
    # Note: We don't strictly need a relationship to User here unless we plan to query it often.