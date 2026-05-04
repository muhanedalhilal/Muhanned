from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session


from app.core.security import get_current_user
from app.database.database import get_db
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
