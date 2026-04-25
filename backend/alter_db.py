import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Import to register models with Base
from app.database.database import engine, Base
import app.models.course
import app.models.document
import app.models.knowledge_component
import app.models.db_user

load_dotenv()

def migrate():
    print("Starting migration...")
    # 1. Create tables if they don't exist (this handles `Course` creation)
    Base.metadata.create_all(bind=engine)
    print("Base metadata created.")

    with engine.connect() as conn:
        # 2. Add course_id to documents
        try:
            conn.execute(text("ALTER TABLE documents ADD COLUMN course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE;"))
            print("Added course_id to documents.")
        except Exception as e:
            print(f"Warning (might already exist): {e}")

        # 3. Add course_id to knowledge_components
        try:
            conn.execute(text("ALTER TABLE knowledge_components ADD COLUMN course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE;"))
            print("Added course_id to knowledge_components.")
        except Exception as e:
            print(f"Warning (might already exist): {e}")

        # 4. Add mastery_prob to knowledge_components
        try:
            conn.execute(text("ALTER TABLE knowledge_components ADD COLUMN mastery_prob FLOAT DEFAULT 0.1;"))
            print("Added mastery_prob to knowledge_components.")
        except Exception as e:
            print(f"Warning: mastery_prob might already exist: {e}")
            
        conn.commit()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
