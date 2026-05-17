from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.core.group_realtime import group_realtime
from app.database.database import get_db
from app.models.db_user import DBUser
from app.models.course import Course
from app.models.group import (
    Group,
    GroupMembership,
    GroupQuizAssignment,
    GroupQuizAttempt,
    GroupStudentProgress,
)
from app.models.knowledge_component import KnowledgeComponent
from app.core.ai_service import generate_quiz_from_kcs

router = APIRouter(prefix="/quiz", tags=["quiz"])

class GenerateQuizRequest(BaseModel):
    kc_ids: List[int] = Field(default_factory=list)
    group_id: Optional[int] = None
    assignment_id: Optional[int] = None

class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    answer: int
    kc_id: int


def _is_group_member(db: Session, group_id: int, user_id: int) -> bool:
    return db.query(GroupMembership.id).filter(
        GroupMembership.group_id == group_id,
        GroupMembership.student_id == user_id,
    ).first() is not None


def _group_recipient_ids(db: Session, group: Group) -> list[int]:
    owner_id = db.query(Course.user_id).filter(Course.id == group.course_id).scalar()
    student_ids = [
        row[0] for row in db.query(GroupMembership.student_id).filter(GroupMembership.group_id == group.id).all()
    ]
    recipients = set(student_ids)
    if owner_id:
        recipients.add(owner_id)
    return list(recipients)


def _get_group_assignment(db: Session, group_id: int, assignment_id: int, current_user: DBUser) -> GroupQuizAssignment:
    assignment = db.query(GroupQuizAssignment).join(Group).filter(
        GroupQuizAssignment.id == assignment_id,
        GroupQuizAssignment.group_id == group_id,
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Quiz assignment not found.")

    group = assignment.group
    owns_course = db.query(Course.id).filter(Course.id == group.course_id, Course.user_id == current_user.id).first()
    if not owns_course and not _is_group_member(db, group.id, current_user.id):
        raise HTTPException(status_code=403, detail="You do not have access to this quiz.")
    return assignment


def _assignment_component_ids(assignment: GroupQuizAssignment) -> list[int]:
    return [item.knowledge_component_id for item in assignment.components]


def _quiz_kcs_for_request(request: GenerateQuizRequest, current_user: DBUser, db: Session) -> list[KnowledgeComponent]:
    if request.group_id and request.assignment_id:
        assignment = _get_group_assignment(db, request.group_id, request.assignment_id, current_user)
        component_ids = _assignment_component_ids(assignment)
        if not component_ids:
            raise HTTPException(status_code=400, detail="This assigned quiz has no components.")
        return db.query(KnowledgeComponent).filter(KnowledgeComponent.id.in_(component_ids)).all()

    if not request.kc_ids:
        raise HTTPException(status_code=400, detail="No components selected.")

    return db.query(KnowledgeComponent).filter(
        KnowledgeComponent.id.in_(request.kc_ids),
        KnowledgeComponent.user_id == current_user.id
    ).all()

@router.post("/generate", response_model=List[QuizQuestion])
def generate_quiz(
    request: GenerateQuizRequest,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generates a quiz based on selected Knowledge Components."""
    kcs = _quiz_kcs_for_request(request, current_user, db)

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
    selected_kc_ids: List[int] = Field(default_factory=list)
    group_id: Optional[int] = None
    assignment_id: Optional[int] = None


def _apply_bkt(p_prev: float, is_correct: bool) -> float:
    p_guess = 0.25
    p_slip = 0.1
    p_transit = 0.1

    if is_correct:
        p_obs = (p_prev * (1 - p_slip)) / ((p_prev * (1 - p_slip)) + ((1 - p_prev) * p_guess))
    else:
        p_obs = (p_prev * p_slip) / ((p_prev * p_slip) + ((1 - p_prev) * (1 - p_guess)))

    return max(0.01, min(0.99, p_obs + ((1 - p_obs) * p_transit)))


@router.post("/submit")
async def submit_quiz(
    request: SubmitQuizRequest,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Applies Bayesian Knowledge Tracing (BKT) to update mastery probability for each component.
    """
    if not request.answers:
        return {"status": "success", "message": "No answers to evaluate."}

    if request.group_id and request.assignment_id:
        assignment = _get_group_assignment(db, request.group_id, request.assignment_id, current_user)
        if current_user.role != "student" or not _is_group_member(db, assignment.group_id, current_user.id):
            raise HTTPException(status_code=403, detail="Only students in this group can submit assigned quiz answers.")

        assignment_component_ids = set(_assignment_component_ids(assignment))
        answer_ids = {answer.kc_id for answer in request.answers}
        if not answer_ids.issubset(assignment_component_ids):
            raise HTTPException(status_code=403, detail="One or more answers are outside this assigned quiz.")

        target_ids = list(assignment_component_ids)
        progress_rows = db.query(GroupStudentProgress).filter(
            GroupStudentProgress.group_id == assignment.group_id,
            GroupStudentProgress.student_id == current_user.id,
            GroupStudentProgress.knowledge_component_id.in_(target_ids),
        ).all()
        progress_map = {row.knowledge_component_id: row for row in progress_rows}

        for component_id in target_ids:
            if component_id not in progress_map:
                progress = GroupStudentProgress(
                    group_id=assignment.group_id,
                    student_id=current_user.id,
                    knowledge_component_id=component_id,
                    mastery_prob=0.1,
                )
                db.add(progress)
                progress_map[component_id] = progress

        for answer in request.answers:
            progress = progress_map.get(answer.kc_id)
            if not progress:
                continue
            progress.mastery_prob = _apply_bkt(progress.mastery_prob or 0.1, answer.is_correct)

        attempt = db.query(GroupQuizAttempt).filter(
            GroupQuizAttempt.assignment_id == assignment.id,
            GroupQuizAttempt.student_id == current_user.id,
        ).first()
        if not attempt:
            attempt = GroupQuizAttempt(assignment_id=assignment.id, student_id=current_user.id)
            db.add(attempt)

        attempt.correct_count = (attempt.correct_count or 0) + sum(1 for answer in request.answers if answer.is_correct)
        attempt.answer_count = (attempt.answer_count or 0) + len(request.answers)
        attempt.average_mastery = sum((progress_map[component_id].mastery_prob or 0.1) for component_id in target_ids) / len(target_ids)

        db.commit()

        results = [
            {"kc_id": component_id, "mastery_prob": progress_map[component_id].mastery_prob}
            for component_id in target_ids
        ]

        group = assignment.group
        await group_realtime.send_to_users(_group_recipient_ids(db, group), {
            "type": "group_progress_updated",
            "groupId": group.id,
            "studentId": current_user.id,
        })
        return {
            "status": "success",
            "message": f"Updated mastery for {len(request.answers)} answers.",
            "kcs": results
        }

    kc_ids = [ans.kc_id for ans in request.answers]
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
            
        kc.mastery_prob = float(_apply_bkt(kc.mastery_prob or 0.1, answer.is_correct))

    db.commit()
    
    results = [{"kc_id": kc.id, "mastery_prob": kc.mastery_prob} for kc in kc_map.values()]
    return {
        "status": "success", 
        "message": f"Updated mastery for {len(request.answers)} answers.",
        "kcs": results
    }
