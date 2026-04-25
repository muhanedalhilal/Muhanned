from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.core.security import get_current_user
from app.database.database import get_db
from app.models.course import Course
from app.models.db_user import DBUser
from app.models.document import Document
from app.models.knowledge_component import KnowledgeComponent
from app.core.supabase_client import supabase
from app.core.ai_service import suggest_components_for_course, validate_and_generate_component

router = APIRouter(prefix="/courses", tags=["courses"])

class CourseCreate(BaseModel):
    name: str
    icon: str = "book"
    color: str = "#3b82f6"

class CourseComponentResponse(BaseModel):
    id: int
    text: str
    content: str
    progress: int = 0
    
    class Config:
        orm_mode = True

class CourseResourceResponse(BaseModel):
    id: int
    text: str
    type: str
    fileUrl: Optional[str] = None
    
    class Config:
        orm_mode = True

class CourseResponse(BaseModel):
    id: int
    name: str
    icon: str
    color: str
    created_at: datetime
    
    resourceList: List[CourseResourceResponse] = []
    componentList: List[CourseComponentResponse] = []
    
    class Config:
        orm_mode = True

@router.get("/", response_model=List[CourseResponse])
def get_courses(
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all courses for the current user."""
    courses = db.query(Course).filter(Course.user_id == current_user.id).all()
    
    result = []
    for c in courses:
        resources = []
        for d in c.documents:
            file_url = None
            if d.supabase_path:
                try:
                    file_url = supabase.storage.from_("documents").get_public_url(d.supabase_path)
                except Exception:
                    pass
            resources.append({"id": d.id, "text": d.filename, "type": d.file_type, "fileUrl": file_url})
            
        components = [{"id": k.id, "text": k.topic, "content": k.content, "progress": int((k.mastery_prob or 0.1) * 100)} for k in c.knowledge_components]
        result.append(CourseResponse(
            id=c.id, name=c.name, icon=c.icon, color=c.color, created_at=c.created_at,
            resourceList=resources, componentList=components
        ))
    return result

@router.post("/", response_model=CourseResponse)
def create_course(
    course_in: CourseCreate,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new course."""
    new_course = Course(
        name=course_in.name,
        icon=course_in.icon,
        color=course_in.color,
        user_id=current_user.id
    )
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    return new_course

@router.delete("/{course_id}")
def delete_course(
    course_id: int,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a course and all its related documents/KCs."""
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    db.delete(course)
    db.commit()
    return {"message": "Course deleted successfully"}

@router.get("/{course_id}/resources")
def get_course_resources(
    course_id: int,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Returns documents linked to this course
    docs = db.query(Document).filter(Document.course_id == course_id, Document.user_id == current_user.id).all()
    res = []
    for d in docs:
        file_url = None
        if d.supabase_path:
            try:
                file_url = supabase.storage.from_("documents").get_public_url(d.supabase_path)
            except Exception:
                pass
        res.append({"id": d.id, "text": d.filename, "type": d.file_type, "fileUrl": file_url})
    return res

@router.get("/{course_id}/components")
def get_course_components(
    course_id: int,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Returns KCs linked to this course
    kcs = db.query(KnowledgeComponent).filter(KnowledgeComponent.course_id == course_id, KnowledgeComponent.user_id == current_user.id).order_by(KnowledgeComponent.id).all()
    return [{"id": k.id, "text": k.topic, "content": k.content, "progress": int((k.mastery_prob or 0.1) * 100)} for k in kcs]


class SuggestComponentsRequest(BaseModel):
    existing_topics: List[str] = []

@router.post("/{course_id}/suggest-components")
def suggest_components(
    course_id: int,
    body: SuggestComponentsRequest,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns 3 AI-suggested Knowledge Component topics for this course."""
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    suggestions = suggest_components_for_course(course.name, body.existing_topics)
    return {"suggestions": suggestions}


class AddManualComponentRequest(BaseModel):
    topic: str

class AddManualComponentResponse(BaseModel):
    id: int
    text: str
    content: str
    progress: int = 0

@router.post("/{course_id}/add-manual-component")
def add_manual_component(
    course_id: int,
    body: AddManualComponentRequest,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Validates a manually entered topic via AI.
    If valid, creates a KnowledgeComponent without a parent document (document_id=-1 sentinel).
    Returns the saved component or a 422 with reason.
    """
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    result = validate_and_generate_component(course.name, body.topic.strip())

    if not result.get("valid"):
        raise HTTPException(
            status_code=422,
            detail=result.get("reason", "This topic does not appear related to the course.")
        )

    # Persist the new manually-added KC (no source document)
    # We use document_id of the first document of the course if available, else create a sentinel approach:
    # Actually KnowledgeComponent.document_id is non-nullable, so find an existing doc or raise.
    # Use a nullable workaround: we'll store document_id = None using a nullable column. 
    # Since the model has nullable=False, we pick the first doc if present, else we reject.
    existing_doc = db.query(Document).filter(
        Document.course_id == course_id,
        Document.user_id == current_user.id
    ).first()

    if not existing_doc:
        # No document uploaded yet — still allow by using a placeholder document approach
        # Create a virtual doc entry for manually-added KCs
        from app.models.document import Document as Doc
        placeholder = Doc(
            filename="Manual Components",
            file_type="manual",
            supabase_path=None,
            user_id=current_user.id,
            course_id=course_id
        )
        db.add(placeholder)
        db.commit()
        db.refresh(placeholder)
        doc_id = placeholder.id
    else:
        doc_id = existing_doc.id

    new_kc = KnowledgeComponent(
        topic=result["topic"],
        content=result["content"],
        document_id=doc_id,
        user_id=current_user.id,
        course_id=course_id
    )
    db.add(new_kc)
    db.commit()
    db.refresh(new_kc)

    return {"id": new_kc.id, "text": new_kc.topic, "content": new_kc.content, "progress": int((new_kc.mastery_prob or 0.1) * 100)}
