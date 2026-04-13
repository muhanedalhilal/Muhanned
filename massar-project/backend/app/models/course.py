from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.database import Base

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    icon = Column(String, default="book")
    color = Column(String, default="#3b82f6")
    
    # Link back to the user who created this course
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    owner = relationship("DBUser", back_populates="courses")
    documents = relationship("Document", back_populates="course", cascade="all, delete-orphan")
    knowledge_components = relationship("KnowledgeComponent", back_populates="course", cascade="all, delete-orphan")
