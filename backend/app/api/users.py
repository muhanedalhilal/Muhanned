from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.database.database import get_db
from app.models.db_user import DBUser
from app.core.security import get_current_user
from app.core.supabase_client import supabase_admin

router = APIRouter(prefix="/users", tags=["users"])


# ──────────────────────────────────────────────
# Pydantic Schema — what the user can update
# ──────────────────────────────────────────────
class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None


# ──────────────────────────────────────────────
# PUT /users/me  →  Update own profile
# ──────────────────────────────────────────────
@router.put("/me")
def update_my_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    """
    Allows any authenticated user to update their own:
    - Name (stored in PostgreSQL)
    - Email (updated in Supabase Auth + PostgreSQL)
    - Password (updated in Supabase Auth only — never stored in our DB)
    """
    uid = current_user.supabase_auth_id
    supabase_updates = {}
    changes_made = []

    # ── 1. Handle Name Update (PostgreSQL only) ──
    if payload.name and payload.name != current_user.name:
        current_user.name = payload.name
        changes_made.append("name")

    # ── 2. Handle Email Update (Supabase Auth + PostgreSQL) ──
    if payload.email and payload.email != current_user.email:
        # Check if the new email is already taken in our DB
        existing = db.query(DBUser).filter(
            DBUser.email == payload.email,
            DBUser.id != current_user.id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This email is already registered to another account."
            )
        supabase_updates["email"] = payload.email
        current_user.email = payload.email
        changes_made.append("email")

    # ── 3. Handle Password Update (Supabase Auth only) ──
    if payload.password:
        if len(payload.password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 6 characters long."
            )
        supabase_updates["password"] = payload.password
        changes_made.append("password")

    # ── 4. Save PostgreSQL changes FIRST (name always saves) ──
    try:
        db.commit()
        db.refresh(current_user)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database update failed: {str(e)}"
        )

    # ── 5. Apply Supabase Auth Updates (email and/or password) ──
    if supabase_updates:
        try:
            supabase_admin.auth.admin.update_user_by_id(uid, supabase_updates)
        except Exception as e:
            # Name was already saved — just warn about Supabase
            return {
                "message": f"Name updated successfully, but email/password update failed. Make sure SUPABASE_SERVICE_KEY is set in .env.",
                "user": {
                    "id": current_user.id,
                    "name": current_user.name,
                    "email": current_user.email,
                    "role": current_user.role,
                }
            }

    if not changes_made:
        return {"message": "No changes were made."}

    return {
        "message": f"Profile updated successfully! ({', '.join(changes_made)} changed)",
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "role": current_user.role,
        }
    }


# ──────────────────────────────────────────────
# GET /users/me  →  Get own full profile
# ──────────────────────────────────────────────
@router.get("/me")
def get_my_full_profile(
    current_user: DBUser = Depends(get_current_user)
):
    """
    Returns the full profile of the currently logged-in user.
    """
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "created_at": current_user.created_at,
    }
