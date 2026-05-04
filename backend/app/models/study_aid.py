from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.database import Base

class StudyAid(Base):
    """
    Persists AI-generated study aids (summaries and mind maps) per user per course.
    """
    __tablename__ = "study_aids"

    id = Column(Integer, primary_key=True, index=True)

    # 'summary' or 'mindmap'
    aid_type = Column(String, nullable=False)

    # Human-readable title e.g. "Study Summary (3)"
    title = Column(String, nullable=False)

    # The full Markdown / Mermaid content
    content = Column(Text, nullable=False)

    # Linked to a course and user
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
