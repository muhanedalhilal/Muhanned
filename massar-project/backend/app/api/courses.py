from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from typing import List, Optional
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
import base64
import uuid

from app.core.security import get_current_user
from app.database.database import get_db
from app.models.course import Course
from app.models.db_user import DBUser
from app.models.document import Document
from app.models.knowledge_component import KnowledgeComponent
from app.core.supabase_client import supabase
from app.core.ai_service import generate_course_image

router = APIRouter(prefix="/courses", tags=["courses"])

class CourseCreate(BaseModel):
    name: str
    description: str = ""
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
    description: Optional[str] = ""
    icon: str
    color: str
    image_url: Optional[str] = None
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
            
        components = [{"id": k.id, "text": k.topic, "content": k.content, "progress": 0} for k in c.knowledge_components]
        result.append(CourseResponse(
            id=c.id, name=c.name, description=c.description or "",
            icon=c.icon, color=c.color, image_url=c.image_url,
            created_at=c.created_at,
            resourceList=resources, componentList=components
        ))
    return result

@router.post("/", response_model=CourseResponse)
def create_course(
    course_in: CourseCreate,
    background_tasks: BackgroundTasks,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new course. AI image generation runs in the background."""
    new_course = Course(
        name=course_in.name,
        description=course_in.description,
        icon=course_in.icon,
        color=course_in.color,
        user_id=current_user.id
    )
    db.add(new_course)
    db.commit()
    db.refresh(new_course)

    # Schedule AI image generation in background
    background_tasks.add_task(_generate_and_save_image, new_course.id, course_in.name, course_in.description)

    return CourseResponse(
        id=new_course.id, name=new_course.name, description=new_course.description or "",
        icon=new_course.icon, color=new_course.color, image_url=None,
        created_at=new_course.created_at,
        resourceList=[], componentList=[]
    )


def _generate_and_save_image(course_id: int, course_name: str, description: str):
    """Background task: generate AI image and save URL to the course."""
    from app.database.database import SessionLocal

    image_bytes = generate_course_image(course_name, description)
    if not image_bytes:
        print(f"No image generated for course {course_id}, skipping.")
        return

    image_url = None

    # Try uploading to Supabase Storage
    try:
        file_name = f"course_{course_id}_{uuid.uuid4().hex[:8]}.jpg"
        storage_path = f"course-images/{file_name}"

        supabase.storage.from_("course-images").upload(
            storage_path,
            image_bytes,
            file_options={"content-type": "image/jpeg"}
        )
        image_url = supabase.storage.from_("course-images").get_public_url(storage_path)
        print(f"Uploaded course image to Supabase: {image_url}")
    except Exception as e:
        print(f"Supabase upload failed: {e}. Falling back to base64 data URL.")
        # Fallback: store as base64 data URL
        b64 = base64.b64encode(image_bytes).decode("utf-8")
        image_url = f"data:image/jpeg;base64,{b64}"

    # Save to database
    if image_url:
        db = SessionLocal()
        try:
            course = db.query(Course).filter(Course.id == course_id).first()
            if course:
                course.image_url = image_url
                db.commit()
                print(f"Saved image URL for course {course_id}")
        except Exception as e:
            db.rollback()
            print(f"Failed to save image URL: {e}")
        finally:
            db.close()


@router.get("/{course_id}/image-status")
def get_course_image_status(
    course_id: int,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Poll endpoint to check if the AI-generated image is ready."""
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return {"image_url": course.image_url, "ready": course.image_url is not None}


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
    kcs = db.query(KnowledgeComponent).filter(KnowledgeComponent.course_id == course_id, KnowledgeComponent.user_id == current_user.id).all()
    return [{"id": k.id, "text": k.topic, "content": k.content, "progress": 0} for k in kcs]
