from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # e.g., pdf, pptx
    supabase_path = Column(String, nullable=False)  # path within the bucket
    
    # Link back to the user who uploaded this document
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    owner = relationship("DBUser", back_populates="documents")
    knowledge_components = relationship("KnowledgeComponent", back_populates="document", cascade="all, delete-orphan")
