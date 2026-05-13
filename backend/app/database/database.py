import os
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

# We pull the database connection URL from our .env file.
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost/massar")

backend_root = Path(__file__).resolve().parents[2]
LOCAL_DATABASE_URL = os.getenv("LOCAL_DATABASE_URL", f"sqlite:///{(backend_root / 'massar_local.db').as_posix()}")

def _create_engine(url: str):
    if url.startswith("sqlite"):
        return create_engine(url, connect_args={"check_same_thread": False})
    return create_engine(url)

engine = _create_engine(DATABASE_URL)

allow_sqlite_fallback = os.getenv("MASSAR_SQLITE_FALLBACK", "true").lower() in {"1", "true", "yes", "on"}
if allow_sqlite_fallback and not DATABASE_URL.startswith("sqlite"):
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except SQLAlchemyError as e:
        print(f"Warning: DATABASE_URL is unavailable. Using local SQLite fallback. Error: {e}")
        DATABASE_URL = LOCAL_DATABASE_URL
        engine = _create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# This is a dependency we will inject into our route functions to give them DB access
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
