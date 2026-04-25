from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.security import get_current_user
from app.database.database import get_db
from app.models.db_user import DBUser
from app.models.knowledge_component import KnowledgeComponent
from app.core.ai_service import generate_quiz_from_text

router = APIRouter(prefix="/quiz", tags=["quiz"])

class GenerateQuizRequest(BaseModel):
    kc_ids: List[int]

class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    answer: int

@router.post("/generate", response_model=List[QuizQuestion])
def generate_quiz(
    request: GenerateQuizRequest,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generates a quiz based on selected Knowledge Components."""
    if not request.kc_ids:
        raise HTTPException(status_code=400, detail="No components selected.")

    # Fetch those KCs
    kcs = db.query(KnowledgeComponent).filter(
        KnowledgeComponent.id.in_(request.kc_ids),
        KnowledgeComponent.user_id == current_user.id
    ).all()

    if not kcs:
        raise HTTPException(status_code=404, detail="Selected components not found or unauthorized.")

    combined_text = "\n\n".join([f"Topic: {kc.topic}\nContent: {kc.content}" for kc in kcs])

    quiz_data = generate_quiz_from_text(combined_text)
    
    if not quiz_data:
        raise HTTPException(status_code=500, detail="Failed to generate quiz from AI.")
        
    return quiz_data
