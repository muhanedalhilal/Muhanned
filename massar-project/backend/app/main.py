from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api import auth, admin, users, upload
from app.database.database import engine, Base
import app.models.db_user  # Imported so SQLAlchemy detects the table
import app.models.document
import app.models.knowledge_component
import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Try to Create PostgreSQL Tables if they don't exist yet
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Database metadata synchronized.")
    except Exception as e:
        print(f"⚠️ Warning: Could not connect to Database on startup. Supabase might be offline. Error: {e}")
    
    yield
    # Cleanup on shutdown (if needed)

app = FastAPI(
    title="Massar-Project Backend",
    description="Backend API for Massar - The AI/BKT Brain",
    version="1.0.0",
    lifespan=lifespan
)

# Restoring CORS so React won't get blocked by the browser!
frontend_url = os.getenv("FRONTEND_URL", "*")
allowed_origins = [frontend_url] if frontend_url != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(users.router)
app.include_router(upload.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Massar Backend"}
