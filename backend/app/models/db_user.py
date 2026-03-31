from sqlalchemy import Column, Integer, String, DateTime
from app.database.database import Base
from datetime import datetime

class DBUser(Base):
    """
    This is the actual representation of our user inside PostgreSQL.
    Firebase handles passwords, so we NEVER store passwords here.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    # The crucial link: This ID ties this postgres record strictly to the Firebase account
    firebase_uid = Column(String, unique=True, index=True, nullable=False) 
    
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    
    # We can add BKT-specific data later, like 'mastery_score', 'role', etc.
    role = Column(String, default="student") 
    created_at = Column(DateTime, default=datetime.utcnow)
