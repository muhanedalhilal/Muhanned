from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.database import Base

class KnowledgeComponent(Base):
    """
    Represents a single "flashcard", "fact", or "topic" extracted by AI from a document.
    """
    __tablename__ = "knowledge_components"

    id = Column(Integer, primary_key=True, index=True)
    
    # For example, "Definition of TCP/IP" or "What is a Neural Network?"
    topic = Column(String, nullable=False)
    
    # Detailed explanation or answer
    content = Column(Text, nullable=False)

    # Link back to the document
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    
    # Link back to the user to make querying faster (who owns this KC)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Link back to the course
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=True)
    
    # BKT/Spaced repetition fields can be added here later (e.g., mastery_level)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    document = relationship("Document", back_populates="knowledge_components")
    owner = relationship("DBUser", back_populates="knowledge_components")
    course = relationship("Course", back_populates="knowledge_components")
