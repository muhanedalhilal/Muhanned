from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.core.security import get_current_user
from app.database.database import get_db
from app.models.course import Course
from app.models.db_user import DBUser
from app.models.document import Document
from app.models.knowledge_component import KnowledgeComponent

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
        resources = [{"id": d.id, "text": d.filename, "type": d.file_type} for d in c.documents]
        components = [{"id": k.id, "text": k.topic, "content": k.content, "progress": 0} for k in c.knowledge_components]
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
    return [{"id": d.id, "text": d.filename, "type": d.file_type} for d in docs]

@router.get("/{course_id}/components")
def get_course_components(
    course_id: int,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Returns KCs linked to this course
    kcs = db.query(KnowledgeComponent).filter(KnowledgeComponent.course_id == course_id, KnowledgeComponent.user_id == current_user.id).all()
    return [{"id": k.id, "text": k.topic, "content": k.content, "progress": 0} for k in kcs]
