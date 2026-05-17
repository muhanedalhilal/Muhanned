import html
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, HTMLResponse
from typing import List, Optional
from sqlalchemy.orm import Session


from app.core.security import get_current_user
from app.core.document_links import document_local_path, document_view_key, document_view_url
from app.database.database import get_db
from app.models.course import Course
from app.models.group import Group, GroupMembership
from app.models.knowledge_component import KnowledgeComponent
from app.models.document import Document
from app.models.db_user import DBUser
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/knowledge", tags=["knowledge"])

class KnowledgeComponentResponse(BaseModel):
    id: int
    topic: str
    content: str
    created_at: datetime

    class Config:
        orm_mode = True


DOCUMENT_MEDIA_TYPES = {
    "pdf": "application/pdf",
    "ppt": "application/vnd.ms-powerpoint",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
}


def _document_content_page(document: Document, kcs: list[KnowledgeComponent]) -> str:
    title = html.escape(document.filename or "Resource")
    topics = "\n".join(
        f"""
        <article class="topic">
          <h2>{html.escape(kc.topic or "Topic")}</h2>
          <p>{html.escape(kc.content or "No content available.").replace(chr(10), "<br>")}</p>
        </article>
        """
        for kc in kcs
    ) or """
        <article class="topic">
          <h2>Content unavailable</h2>
          <p>The original file is not available locally and no generated topic content was found.</p>
        </article>
    """

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <style>
    body {{ margin: 0; background: #0f172a; color: #e5e7eb; font-family: Inter, Arial, sans-serif; }}
    main {{ max-width: 900px; margin: 0 auto; padding: 42px 24px 70px; }}
    .eyebrow {{ color: #38bdf8; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }}
    h1 {{ margin: 10px 0 24px; font-size: 32px; line-height: 1.2; }}
    .topic {{ background: #111827; border: 1px solid #243244; border-radius: 12px; padding: 22px; margin: 16px 0; }}
    .topic h2 {{ margin: 0 0 10px; color: #f8fafc; font-size: 20px; }}
    .topic p {{ margin: 0; color: #cbd5e1; line-height: 1.7; }}
  </style>
</head>
<body>
  <main>
    <div class="eyebrow">Resource Content</div>
    <h1>{title}</h1>
    {topics}
  </main>
</body>
</html>"""


def _can_access_document(document: Document, current_user: DBUser, db: Session, group_id: Optional[int] = None) -> bool:
    if document.user_id == current_user.id:
        return True
    if not document.course_id:
        return False

    if group_id:
        group = db.query(Group).filter(
            Group.id == group_id,
            Group.course_id == document.course_id,
        ).first()
        if not group:
            return False
        owns_group_course = db.query(Course.id).filter(
            Course.id == group.course_id,
            Course.user_id == current_user.id,
        ).first()
        if owns_group_course:
            return True
        return db.query(GroupMembership.id).filter(
            GroupMembership.group_id == group.id,
            GroupMembership.student_id == current_user.id,
        ).first() is not None

    owns_course = db.query(Course.id).filter(
        Course.id == document.course_id,
        Course.user_id == current_user.id,
    ).first()
    if owns_course:
        return True
    return db.query(GroupMembership.id).join(Group).filter(
        Group.course_id == document.course_id,
        GroupMembership.student_id == current_user.id,
    ).first() is not None

@router.get("/documents/{doc_id}/kcs", response_model=List[KnowledgeComponentResponse])
def get_kcs(
    doc_id: int,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return all Knowledge Components for a document owned by the current user."""
    # Verify ownership
    document = (
        db.query(Document)
        .filter(Document.id == doc_id, Document.user_id == current_user.id)
        .first()
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    kcs = (
        db.query(KnowledgeComponent)
        .filter(KnowledgeComponent.document_id == doc_id)
        .all()
    )
    return kcs


@router.get("/documents/{doc_id}/view")
def view_document(
    doc_id: int,
    key: str = "",
    db: Session = Depends(get_db)
):
    document = db.query(Document).filter(Document.id == doc_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    if key != document_view_key(document):
        raise HTTPException(status_code=403, detail="Invalid resource link")

    local_path = document_local_path(document)
    if local_path and local_path.exists():
        media_type = DOCUMENT_MEDIA_TYPES.get((document.file_type or "").lower(), "application/octet-stream")
        return FileResponse(
            str(local_path),
            media_type=media_type,
            headers={"Content-Disposition": f"inline; filename*=UTF-8''{quote(document.filename or local_path.name)}"}
        )

    kcs = (
        db.query(KnowledgeComponent)
        .filter(KnowledgeComponent.document_id == doc_id)
        .order_by(KnowledgeComponent.id)
        .all()
    )
    return HTMLResponse(_document_content_page(document, kcs))


@router.get("/documents/{doc_id}/link")
def document_link(
    doc_id: int,
    group_id: Optional[int] = None,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    document = db.query(Document).filter(Document.id == doc_id).first()
    if not document or not _can_access_document(document, current_user, db, group_id=group_id):
        raise HTTPException(status_code=404, detail="Document not found")
    return {
        "id": document.id,
        "text": document.filename,
        "type": document.file_type,
        "fileUrl": document_view_url(document),
    }

@router.delete("/documents/{doc_id}")
def delete_document(
    doc_id: int,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a document and all associated Knowledge Components."""
    document = (
        db.query(Document)
        .filter(Document.id == doc_id, Document.user_id == current_user.id)
        .first()
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Explicitly delete child knowledge components to prevent foreign key IntegrityErrors
    db.query(KnowledgeComponent).filter(KnowledgeComponent.document_id == doc_id).delete(synchronize_session=False)
    
    db.delete(document)
    db.commit()
    return {"message": "Document and associated Knowledge Components deleted successfully."}

@router.delete("/components/{kc_id}")
def delete_knowledge_component(
    kc_id: int,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a specific Knowledge Component."""
    kc = (
        db.query(KnowledgeComponent)
        .filter(KnowledgeComponent.id == kc_id, KnowledgeComponent.user_id == current_user.id)
        .first()
    )
    if not kc:
        raise HTTPException(status_code=404, detail="Knowledge Component not found")
        
    db.delete(kc)
    db.commit()
    return {"message": "Knowledge Component deleted successfully."}
