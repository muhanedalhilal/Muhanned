from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.knowledge_component import KnowledgeComponent
from app.models.study_aid import StudyAid
from app.core.ai_service import generate_summary_from_kcs, generate_mind_map_from_kcs
from app.core.security import get_current_user
from app.models.db_user import DBUser
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter(prefix="/study-aids", tags=["study-aids"])

class StudyAidRequest(BaseModel):
    kc_ids: List[int]
    course_id: int
    title: Optional[str] = None

class StudyAidSaveRequest(BaseModel):
    aid_type: str
    title: str
    content: str
    course_id: int


def build_title(aid_type: str, kcs) -> str:
    """Build a human-readable title from the KC topics."""
    prefix = "Summary" if aid_type == "summary" else "Mind Map"
    topics = [kc.topic for kc in kcs]
    if len(topics) == 1:
        return f"{prefix}: {topics[0]}"
    elif len(topics) <= 3:
        return f"{prefix}: {', '.join(topics)}"
    else:
        # Show first 2 topics then '+ N more'
        shown = ', '.join(topics[:2])
        return f"{prefix}: {shown} +{len(topics) - 2} more"

# --- Generate & Auto-Save Summary ---
@router.post("/summary")
def generate_summary(
    request: StudyAidRequest,
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    if not request.kc_ids:
        raise HTTPException(status_code=400, detail="No Knowledge Components selected.")

    kcs = db.query(KnowledgeComponent).filter(KnowledgeComponent.id.in_(request.kc_ids)).all()
    if not kcs:
        raise HTTPException(status_code=404, detail="Selected Knowledge Components not found.")

    kc_data = [{"id": kc.id, "topic": kc.topic, "content": kc.content} for kc in kcs]
    summary_md = generate_summary_from_kcs(kc_data)

    title = request.title or build_title("summary", kcs)
    aid = StudyAid(
        aid_type="summary",
        title=title,
        content=summary_md,
        course_id=request.course_id,
        user_id=current_user.id
    )
    db.add(aid)
    db.commit()
    db.refresh(aid)

    return {"summary": summary_md, "saved_id": aid.id, "title": aid.title}

# --- Generate & Auto-Save Mind Map ---
@router.post("/mindmap")
def generate_mind_map(
    request: StudyAidRequest,
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    if not request.kc_ids:
        raise HTTPException(status_code=400, detail="No Knowledge Components selected.")

    kcs = db.query(KnowledgeComponent).filter(KnowledgeComponent.id.in_(request.kc_ids)).all()
    if not kcs:
        raise HTTPException(status_code=404, detail="Selected Knowledge Components not found.")

    kc_data = [{"id": kc.id, "topic": kc.topic, "content": kc.content} for kc in kcs]
    mindmap_mermaid = generate_mind_map_from_kcs(kc_data)

    title = request.title or build_title("mindmap", kcs)
    aid = StudyAid(
        aid_type="mindmap",
        title=title,
        content=mindmap_mermaid,
        course_id=request.course_id,
        user_id=current_user.id
    )
    db.add(aid)
    db.commit()
    db.refresh(aid)

    return {"mindmap": mindmap_mermaid, "saved_id": aid.id, "title": aid.title}

# --- List all aids for a course ---
@router.get("/course/{course_id}")
def get_study_aids_for_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    aids = db.query(StudyAid).filter(
        StudyAid.course_id == course_id,
        StudyAid.user_id == current_user.id
    ).order_by(StudyAid.created_at.desc()).all()

    return [
        {"id": a.id, "type": a.aid_type, "title": a.title, "content": a.content}
        for a in aids
    ]

# --- Delete a study aid ---
@router.delete("/{aid_id}")
def delete_study_aid(
    aid_id: int,
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    aid = db.query(StudyAid).filter(
        StudyAid.id == aid_id,
        StudyAid.user_id == current_user.id
    ).first()
    if not aid:
        raise HTTPException(status_code=404, detail="Study aid not found.")
    db.delete(aid)
    db.commit()
    return {"message": "Deleted successfully."}
