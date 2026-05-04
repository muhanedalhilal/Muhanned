import os
import shutil
import uuid
import PyPDF2
from pptx import Presentation
from fastapi import APIRouter, File, UploadFile, Depends, HTTPException, status, Form
from sqlalchemy.orm import Session
from app.core.security import get_current_user
from app.models.db_user import DBUser
from app.models.document import Document
from app.models.knowledge_component import KnowledgeComponent
from app.database.database import get_db
from app.core.supabase_client import supabase
from app.core.ai_service import generate_kcs_from_text

router = APIRouter(prefix="/upload", tags=["upload"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".ppt", ".pptx"}

def extract_text_from_file(file_path: str, ext: str) -> str:
    text = ""
    try:
        if ext == ".pdf":
            with open(file_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    text += page.extract_text() + "\n"
        elif ext in [".ppt", ".pptx"]:
            prs = Presentation(file_path)
            for slide in prs.slides:
                for shape in slide.shapes:
                    if hasattr(shape, "text"):
                        text += shape.text + "\n"
    except Exception as e:
        print(f"Extraction error: {e}")
    return text

@router.post("/")
def upload_file(
    file: UploadFile = File(...),
    course_id: int = Form(None),
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Accepts educational files securely. 
    1. Saves temp to local disk
    2. Uploads to Supabase Storage
    3. Extracts text
    4. Calls Gemini to generate Knowledge Components (KCs)
    5. Saves Document and KCs strictly to Postgres
    """
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Only {', '.join(ALLOWED_EXTENSIONS)} are allowed."
        )

    safe_filename = f"{uuid.uuid4()}{ext}"
    save_path = os.path.join(UPLOAD_DIR, safe_filename)

    # 1. Save locally first
    try:
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to handle temp file: {str(e)}")
    finally:
        file.file.close()

    # 2. Upload to Supabase Storage Bucket ('documents')
    storage_path = f"{current_user.supabase_auth_id}/{safe_filename}"
    try:
        with open(save_path, "rb") as f:
            res = supabase.storage.from_("documents").upload(storage_path, f, {"content-type": file.content_type})
    except Exception as e:
        # Ignore errors if bucket not set up properly or already exists
        print(f"Supabase Upload Warning: {e}")
        # Note: If this fails, we will still process the text locally.

    # 3. Create Document Record in DB
    new_doc = Document(
        filename=file.filename,
        file_type=ext.replace('.', ''),
        supabase_path=storage_path,
        user_id=current_user.id,
        course_id=course_id
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    # 4. Extract text
    extracted_text = extract_text_from_file(save_path, ext)

    # 5. Generate KCs with AI
    kcs_data = []
    if extracted_text.strip():
        kcs_data = generate_kcs_from_text(extracted_text)

        # 6. Save KCs to Postgres
        for kc in kcs_data:
            topic = kc.get("topic", "Unknown Topic")
            content = kc.get("content", "No content provided.")
            
            new_kc = KnowledgeComponent(
                topic=topic,
                content=content,
                document_id=new_doc.id,
                user_id=current_user.id,
                course_id=course_id
            )
            db.add(new_kc)
        db.commit()

    # Optionally clean up the local temp file to save space
    try:
        os.remove(save_path)
    except:
        pass

    return {
        "message": "File processed and AI KCs generated!",
        "document_id": new_doc.id,
        "kcs_generated": len(kcs_data)
    }
