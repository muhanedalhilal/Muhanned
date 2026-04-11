import os
import shutil
import uuid
from fastapi import APIRouter, File, UploadFile, Depends, HTTPException, status
from app.core.security import get_current_user
from app.models.db_user import DBUser

router = APIRouter(prefix="/upload", tags=["upload"])

UPLOAD_DIR = "uploads"
# Ensure the uploads directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".ppt", ".pptx"}

@router.post("/")
def upload_file(
    file: UploadFile = File(...),
    current_user: DBUser = Depends(get_current_user)
):
    """
    Accepts educational files securely. 
    Validates extension and saves locally using a UUID to avoid collisions.
    """
    # 1. Validate Extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Only {', '.join(ALLOWED_EXTENSIONS)} are allowed."
        )

    # 2. Generate Safe Filename
    safe_filename = f"{uuid.uuid4()}{ext}"
    save_path = os.path.join(UPLOAD_DIR, safe_filename)

    # 3. Save File
    try:
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
    finally:
        file.file.close()

    # 4. Return Confirmation
    return {
        "message": "File uploaded successfully",
        "original_filename": file.filename,
        "saved_filename": safe_filename,
        "saved_path": save_path,
        "file_type": ext.replace('.', '')
    }
