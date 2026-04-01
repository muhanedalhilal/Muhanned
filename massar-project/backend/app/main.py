from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api import auth
from app.database.database import engine, Base
import app.models.db_user  # Imported so SQLAlchemy detects the table

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create PostgreSQL Tables if they don't exist yet
    Base.metadata.create_all(bind=engine)
    
    yield
    # Cleanup on shutdown (if needed)

app = FastAPI(
    title="Massar-Project Backend",
    description="Backend API for Massar - The AI/BKT Brain",
    version="1.0.0",
    lifespan=lifespan
)

# Restoring CORS so React won't get blocked by the browser!
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Massar Backend"}
