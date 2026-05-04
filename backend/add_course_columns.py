"""
Migration script to add 'description' and 'image_url' columns to the courses table.
Run this once: python add_course_columns.py
"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost/massar")
engine = create_engine(DATABASE_URL)

def migrate():
    with engine.connect() as conn:
        # Check and add 'description' column
        result = conn.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='courses' AND column_name='description'
        """))
        if result.fetchone() is None:
            conn.execute(text("ALTER TABLE courses ADD COLUMN description TEXT DEFAULT ''"))
            print("Added 'description' column to courses table.")
        else:
            print("'description' column already exists.")

        # Check and add 'image_url' column
        result = conn.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='courses' AND column_name='image_url'
        """))
        if result.fetchone() is None:
            conn.execute(text("ALTER TABLE courses ADD COLUMN image_url TEXT"))
            print("Added 'image_url' column to courses table.")
        else:
            print("'image_url' column already exists.")

        conn.commit()
        print("Migration complete!")

if __name__ == "__main__":
    migrate()
