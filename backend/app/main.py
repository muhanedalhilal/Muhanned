from fastapi import FastAPI

app = FastAPI(
    title="Massar-Project Backend",
    description="Backend API for Massar - The AI/BKT Brain",
    version="1.0.0"
)

@app.get("/")
def read_root():
    return {"message": "Welcome to Massar Backend"}
