from fastapi import APIRouter

router = APIRouter(prefix="/upload", tags=["upload"])

@router.post("/")
def upload_file():
    return {"message": "Upload logic will go here"}
