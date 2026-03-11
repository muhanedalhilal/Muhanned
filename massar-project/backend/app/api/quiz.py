from fastapi import APIRouter

router = APIRouter(prefix="/quiz", tags=["quiz"])

@router.get("/")
def get_quiz():
    return {"message": "Quiz logic will go here"}
