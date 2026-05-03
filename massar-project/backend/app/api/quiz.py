from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.security import get_current_user
from app.database.database import get_db
from app.models.db_user import DBUser
from app.models.knowledge_component import KnowledgeComponent
from app.core.ai_service import generate_quiz_from_kcs

router = APIRouter(prefix="/quiz", tags=["quiz"])

class GenerateQuizRequest(BaseModel):
    kc_ids: List[int]

class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    answer: int
    kc_id: int

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

    # Format the data for the AI prompt
    kc_data = [{"id": kc.id, "topic": kc.topic, "content": kc.content, "mastery_prob": kc.mastery_prob or 0.1} for kc in kcs]

    quiz_data = generate_quiz_from_kcs(kc_data)
    
    if not quiz_data:
        raise HTTPException(status_code=500, detail="Failed to generate quiz from AI.")
        
    return quiz_data


class QuizAnswer(BaseModel):
    kc_id: int
    is_correct: bool

class SubmitQuizRequest(BaseModel):
    answers: List[QuizAnswer]
    selected_kc_ids: List[int] = []

@router.post("/submit")
def submit_quiz(
    request: SubmitQuizRequest,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Applies Bayesian Knowledge Tracing (BKT) to update mastery probability for each component.
    """
    if not request.answers:
        return {"status": "success", "message": "No answers to evaluate."}

    # BKT Constants
    P_GUESS = 0.25 # 4 options -> 25% chance
    P_SLIP = 0.1   # 10% chance to mess up even if they know it
    P_TRANSIT = 0.1 # 10% chance they learn it from this interaction

    kc_ids = [ans.kc_id for ans in request.answers]
    # Fetch answers' KCs plus any selected KCs to return their full mastery
    all_target_ids = list(set(kc_ids + request.selected_kc_ids))
    
    kcs = db.query(KnowledgeComponent).filter(
        KnowledgeComponent.id.in_(all_target_ids),
        KnowledgeComponent.user_id == current_user.id
    ).all()

    kc_map = {kc.id: kc for kc in kcs}
    
    for answer in request.answers:
        kc = kc_map.get(answer.kc_id)
        if not kc:
            continue
            
        p_prev = kc.mastery_prob or 0.1 # default
        
        if answer.is_correct:
            # P(L|Obs) if correct
            p_obs = (p_prev * (1 - P_SLIP)) / ((p_prev * (1 - P_SLIP)) + ((1 - p_prev) * P_GUESS))
        else:
            # P(L|Obs) if incorrect
            p_obs = (p_prev * P_SLIP) / ((p_prev * P_SLIP) + ((1 - p_prev) * (1 - P_GUESS)))

        # New Mastery P(L_n) = P(L|Obs) + (1 - P(L|Obs)) * p_transit
        p_new = p_obs + ((1 - p_obs) * P_TRANSIT)
        
        # Clamp to realistic bounds
        if p_new > 0.99:
            p_new = 0.99
        if p_new < 0.01:
            p_new = 0.01
            
        kc.mastery_prob = float(p_new)

    db.commit()
    
    results = [{"kc_id": kc.id, "mastery_prob": kc.mastery_prob} for kc in kc_map.values()]
    return {
        "status": "success", 
        "message": f"Updated mastery for {len(request.answers)} answers.",
        "kcs": results
    }
