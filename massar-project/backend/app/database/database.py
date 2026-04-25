import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

# We pull the database connection URL from our .env file.
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost/massar")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# This is a dependency we will inject into our route functions to give them DB access
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
