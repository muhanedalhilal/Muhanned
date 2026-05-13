from fastapi import APIRouter, Depends, HTTPException, Response, status
from typing import List, Optional
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from pathlib import Path
import hashlib
import hmac
import os
import time
import requests

from app.core.security import get_current_user
from app.database.database import get_db
from app.models.course import Course
from app.models.db_user import DBUser
from app.models.document import Document
from app.models.knowledge_component import KnowledgeComponent
from app.models.group import Group
from app.core.supabase_client import supabase
from app.core.ai_service import suggest_components_for_course, validate_and_generate_component, fallback_kcs_for_resource
from app.core.course_images import build_course_image_url, build_course_image_fallback_url

router = APIRouter(prefix="/courses", tags=["courses"])
COVER_PIPELINE_VERSION = "2026-05-06-v3"

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

class GroupCreate(BaseModel):
    name: str

class GroupResponse(BaseModel):
    id: int
    name: str
    studentCount: int = 0
    created_at: datetime
    
    class Config:
        orm_mode = True

class CourseResponse(BaseModel):
    id: int
    name: str
    icon: str
    color: str
    created_at: datetime
    image_url: Optional[str] = None
    image_fallback_url: Optional[str] = None
    
    resourceList: List[CourseResourceResponse] = []
    componentList: List[CourseComponentResponse] = []
    groups: List[GroupResponse] = []
    
    class Config:
        orm_mode = True


def _backend_public_url() -> str:
    return os.getenv("BACKEND_PUBLIC_URL", "http://127.0.0.1:8000").rstrip("/")


def _course_image_version(course: Course, variant: str) -> str:
    source = f"{COVER_PIPELINE_VERSION}|{course.id}|{course.name}|{course.color}|{variant}"
    return hashlib.sha256(source.encode("utf-8")).hexdigest()[:16]


def _course_image_key(course: Course, variant: str) -> str:
    secret = os.getenv("SECRET_KEY", "massar-dev-cover-key")
    source = f"{course.id}|{course.name}|{course.color}|{variant}"
    return hmac.new(secret.encode("utf-8"), source.encode("utf-8"), hashlib.sha256).hexdigest()[:24]


def _course_cover_proxy_url(course: Course, variant: str = "primary") -> str:
    version = _course_image_version(course, variant)
    key = _course_image_key(course, variant)
    return f"{_backend_public_url()}/courses/{course.id}/cover-image?variant={variant}&v={version}&key={key}"


def _course_image_url(course: Course) -> str:
    return _course_cover_proxy_url(course, "primary")


def _course_image_fallback_url(course: Course) -> str:
    return _course_cover_proxy_url(course, "fallback")


def _cover_cache_dir() -> Path:
    path = os.getenv("MASSAR_COVER_CACHE_DIR")
    if path:
        return Path(path)
    return Path(__file__).resolve().parents[2] / "generated" / "course_covers"


def _cover_cache_file(course: Course, variant: str) -> Path:
    version = _course_image_version(course, variant)
    return _cover_cache_dir() / f"course-{course.id}-{variant}-{version}.img"


def _image_source_urls(course: Course, variant: str) -> list[str]:
    if variant == "fallback":
        return [
            build_course_image_fallback_url(course.name, course.color, course.id),
            build_course_image_fallback_url(course.name, course.color, f"{course.id}-alt-fallback"),
            build_course_image_url(course.name, course.color, f"{course.id}-rescue"),
        ]
    return [
        build_course_image_url(course.name, course.color, course.id),
        build_course_image_url(course.name, course.color, f"{course.id}-alt-primary"),
        build_course_image_fallback_url(course.name, course.color, course.id),
        build_course_image_fallback_url(course.name, course.color, f"{course.id}-alt-fallback"),
    ]


def _detect_image_content_type(image_bytes: bytes) -> str:
    if image_bytes.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if image_bytes.startswith(b"RIFF") and b"WEBP" in image_bytes[:24]:
        return "image/webp"
    if image_bytes.startswith(b"<svg") or image_bytes.startswith(b"<?xml"):
        return "image/svg+xml"
    return "image/jpeg"


def _fetch_generated_cover(url: str, errors: list[str]) -> tuple[bytes | None, str | None]:
    for attempt in range(3):
        try:
            response = requests.get(
                url,
                timeout=(12, 70),
                headers={
                    "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
                    "User-Agent": "MassarCourseCover/1.0",
                },
            )
            content_type = (response.headers.get("content-type") or "").lower()
            status_code = response.status_code
            body = response.content or b""

            if response.ok and body and content_type.startswith("image/"):
                detected_type = _detect_image_content_type(body)
                # Ignore SVG responses from remote providers for primary display quality.
                if detected_type != "image/svg+xml" and len(body) > 12000:
                    return body, detected_type
                errors.append(f"weak-image {status_code} {content_type} bytes={len(body)}")
            else:
                errors.append(f"{status_code} {content_type}".strip())

            if status_code in (408, 425, 429, 500, 502, 503, 504) and attempt < 2:
                time.sleep(1.1 * (attempt + 1))
        except Exception as exc:
            errors.append(str(exc))
            if attempt < 2:
                time.sleep(1.1 * (attempt + 1))
    return None, None


def _last_resort_cover_svg(course: Course) -> bytes:
    title = course.name.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")[:64]
    accent = course.color if course.color and course.color.startswith("#") else "#3b82f6"
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#070a12"/>
      <stop offset="0.55" stop-color="#111827"/>
      <stop offset="1" stop-color="#020617"/>
    </linearGradient>
    <radialGradient id="glow" cx="34%" cy="28%" r="70%">
      <stop offset="0" stop-color="{accent}" stop-opacity="0.48"/>
      <stop offset="0.55" stop-color="{accent}" stop-opacity="0.12"/>
      <stop offset="1" stop-color="{accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="675" fill="url(#bg)"/>
  <rect width="1200" height="675" fill="url(#glow)"/>
  <rect x="82" y="86" width="1036" height="503" rx="52" fill="#ffffff" opacity="0.055"/>
  <rect x="102" y="116" width="998" height="190" rx="36" fill="#0b1220" opacity="0.68"/>
  <text x="132" y="210" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="800" fill="#ffffff">{title}</text>
  <rect x="132" y="234" width="500" height="14" rx="7" fill="#ffffff" opacity="0.24"/>
  <rect x="132" y="260" width="350" height="11" rx="6" fill="#ffffff" opacity="0.15"/>
</svg>"""
    return svg.encode("utf-8")


def _ensure_document_components(course: Course, current_user: DBUser, db: Session) -> bool:
    created = False
    documents = db.query(Document).filter(
        Document.course_id == course.id,
        Document.user_id == current_user.id
    ).all()

    for document in documents:
        has_components = db.query(KnowledgeComponent.id).filter(
            KnowledgeComponent.document_id == document.id,
            KnowledgeComponent.user_id == current_user.id
        ).first()
        if has_components:
            continue

        for kc in fallback_kcs_for_resource(None, document.filename):
            db.add(KnowledgeComponent(
                topic=kc["topic"],
                content=kc["content"],
                document_id=document.id,
                user_id=current_user.id,
                course_id=course.id
            ))
        created = True

    if created:
        db.commit()

    return created


def _course_to_response(course: Course, db: Session | None = None) -> CourseResponse:
    resources = []
    documents = course.documents if db is None else db.query(Document).filter(Document.course_id == course.id).order_by(Document.id).all()
    for document in documents:
        file_url = None
        if document.supabase_path:
            try:
                file_url = supabase.storage.from_("documents").get_public_url(document.supabase_path)
            except Exception:
                pass
        resources.append({
            "id": document.id,
            "text": document.filename,
            "type": document.file_type,
            "fileUrl": file_url
        })

    knowledge_components = course.knowledge_components if db is None else db.query(KnowledgeComponent).filter(KnowledgeComponent.course_id == course.id).order_by(KnowledgeComponent.id).all()
    components = [
        {
            "id": kc.id,
            "text": kc.topic,
            "content": kc.content,
            "progress": int((kc.mastery_prob or 0.1) * 100)
        }
        for kc in knowledge_components
    ]

    course_groups = course.groups if db is None else db.query(Group).filter(Group.course_id == course.id).order_by(Group.id).all()
    groups = [
        {
            "id": g.id,
            "name": g.name,
            "studentCount": 0, # Placeholder for now
            "created_at": g.created_at
        }
        for g in course_groups
    ]

    return CourseResponse(
        id=course.id,
        name=course.name,
        icon=course.icon,
        color=course.color,
        created_at=course.created_at,
        image_url=_course_image_url(course),
        image_fallback_url=_course_image_fallback_url(course),
        resourceList=resources,
        componentList=components,
        groups=groups
    )

@router.get("/", response_model=List[CourseResponse])
def get_courses(
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all courses for the current user."""
    courses = db.query(Course).filter(Course.user_id == current_user.id).all()
    for course in courses:
        _ensure_document_components(course, current_user, db)
    return [_course_to_response(course, db) for course in courses]

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
    return _course_to_response(new_course, db)

@router.post("/{course_id}/groups", response_model=GroupResponse)
def create_course_group(
    course_id: int,
    group_in: GroupCreate,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new group in a course."""
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    new_group = Group(
        name=group_in.name,
        course_id=course.id
    )
    db.add(new_group)
    db.commit()
    db.refresh(new_group)
    
    return GroupResponse(
        id=new_group.id,
        name=new_group.name,
        studentCount=0,
        created_at=new_group.created_at
    )

@router.get("/{course_id}/image-status")
def get_course_image_status(
    course_id: int,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return the AI-generated course cover image URL."""
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    return {
        "ready": True,
        "image_url": _course_image_url(course),
        "image_fallback_url": _course_image_fallback_url(course)
    }


@router.get("/{course_id}/cover-image")
def get_course_cover_image(
    course_id: int,
    variant: str = "primary",
    key: str = "",
    db: Session = Depends(get_db)
):
    """Serve the generated AI cover image through the backend.

    Browser image tags cannot attach the Bearer token we use for the JSON API,
    so course responses include a short signed URL for this image endpoint.
    """
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    variant = "fallback" if variant == "fallback" else "primary"
    expected_key = _course_image_key(course, variant)
    if not hmac.compare_digest(key, expected_key):
        raise HTTPException(status_code=403, detail="Invalid image key")

    cache_file = _cover_cache_file(course, variant)
    headers = {
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
    }
    if cache_file.exists():
        payload = cache_file.read_bytes()
        return Response(payload, media_type=_detect_image_content_type(payload), headers=headers)

    errors = []
    for source_url in _image_source_urls(course, variant):
        image_bytes, content_type = _fetch_generated_cover(source_url, errors)
        if image_bytes and content_type:
            cache_file.parent.mkdir(parents=True, exist_ok=True)
            cache_file.write_bytes(image_bytes)
            return Response(image_bytes, media_type=content_type, headers=headers)

    # Last-resort response prevents broken image icons if the remote AI image
    # service is temporarily unavailable.
    fallback_svg = _last_resort_cover_svg(course)
    return Response(
        fallback_svg,
        media_type="image/svg+xml",
        headers={**headers, "Cache-Control": "no-store", "X-Cover-Image-Error": " | ".join(errors)[:240]},
    )

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
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    _ensure_document_components(course, current_user, db)
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

    # Fetch actual KC content — try course_id first, fall back to document-linked KCs
    existing_kcs = db.query(KnowledgeComponent).filter(
        KnowledgeComponent.course_id == course_id,
        KnowledgeComponent.user_id == current_user.id
    ).all()

    if not existing_kcs:
        from app.models.document import Document as Doc
        doc_ids = [d.id for d in db.query(Doc).filter(
            Doc.course_id == course_id,
            Doc.user_id == current_user.id
        ).all()]
        if doc_ids:
            existing_kcs = db.query(KnowledgeComponent).filter(
                KnowledgeComponent.document_id.in_(doc_ids)
            ).all()

    existing_kc_data = [
        {"topic": kc.topic, "content": kc.content}
        for kc in existing_kcs
        if kc.topic and kc.content
    ]

    suggestions = suggest_components_for_course(course.name, body.existing_topics, existing_kc_data)
    return {"suggestions": suggestions}


class AddManualComponentRequest(BaseModel):
    topic: str
    is_suggestion: bool = False

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

    # Fetch existing KCs — try course_id first, fall back to document-linked KCs
    # (course_id on KC may be NULL for older uploads)
    existing_kcs = db.query(KnowledgeComponent).filter(
        KnowledgeComponent.course_id == course_id,
        KnowledgeComponent.user_id == current_user.id
    ).limit(15).all()

    from app.models.document import Document as Doc
    doc_ids = [d.id for d in db.query(Doc).filter(
        Doc.course_id == course_id,
        Doc.user_id == current_user.id
    ).all()]
    has_documents = len(doc_ids) > 0

    # If none found via course_id, try via documents that belong to this course
    if not existing_kcs and has_documents:
        print(f"[debug] Course {course_id} has docs: {doc_ids}")
        existing_kcs = db.query(KnowledgeComponent).filter(
            KnowledgeComponent.document_id.in_(doc_ids)
        ).limit(15).all()
        print(f"[debug] KCs from doc_ids: {len(existing_kcs)}")

    existing_kc_data = [
        {"topic": kc.topic, "content": kc.content or ""}
        for kc in existing_kcs
        if kc.topic
    ]

    print(f"[validate] course_id={course_id} user_id={current_user.id} found {len(existing_kcs)} KCs, {len(existing_kc_data)} with topics for validation")

    result = validate_and_generate_component(
        course.name, 
        body.topic.strip(), 
        existing_kc_data, 
        is_suggestion=body.is_suggestion,
        has_documents=has_documents
    )

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
