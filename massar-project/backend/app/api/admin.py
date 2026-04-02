from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta

from app.database.database import get_db
from app.models.db_user import DBUser
from app.core.security import require_admin

router = APIRouter(prefix="/admin", tags=["admin"])


# ──────────────────────────────────────────────
# Pydantic Schema for editing a user
# ──────────────────────────────────────────────
class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None


# ──────────────────────────────────────────────
# GET /admin/users  →  List ALL users
# ──────────────────────────────────────────────
@router.get("/users")
def list_all_users(
    db: Session = Depends(get_db),
    admin: DBUser = Depends(require_admin)
):
    """
    Returns a list of every user registered on the platform.
    Only accessible by admins.
    """
    users = db.query(DBUser).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "created_at": u.created_at,
        }
        for u in users
    ]


# ──────────────────────────────────────────────
# PUT /admin/users/{user_id}  →  Edit a user
# ──────────────────────────────────────────────
@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    admin: DBUser = Depends(require_admin)
):
    """
    Allows an admin to update a user's name or role.
    """
    user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if payload.name is not None:
        user.name = payload.name
    if payload.role is not None:
        allowed_roles = {"student", "admin", "teacher"}
        if payload.role not in allowed_roles:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid role. Must be one of: {allowed_roles}"
            )
        user.role = payload.role

    db.commit()
    db.refresh(user)

    return {
        "message": f"User {user_id} updated successfully.",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
        }
    }


# ──────────────────────────────────────────────
# DELETE /admin/users/{user_id}  →  Delete a user
# ──────────────────────────────────────────────
@router.delete("/users/{user_id}", status_code=status.HTTP_200_OK)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: DBUser = Depends(require_admin)
):
    """
    Permanently removes a user from the PostgreSQL database.
    Note: This does NOT automatically delete them from Supabase Auth.
    """
    user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Prevent an admin from deleting themselves
    if user.id == admin.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own admin account."
        )

    db.delete(user)
    db.commit()

    return {"message": f"User {user_id} ({user.email}) has been deleted."}


# ──────────────────────────────────────────────
# GET /admin/stats  →  Platform-wide statistics
# ──────────────────────────────────────────────
@router.get("/stats")
def get_platform_stats(
    db: Session = Depends(get_db),
    admin: DBUser = Depends(require_admin)
):
    """
    Returns high-level platform statistics for the admin dashboard.
    """
    total_users = db.query(func.count(DBUser.id)).scalar()

    # Count users who signed up in the last 7 days
    one_week_ago = datetime.utcnow() - timedelta(days=7)
    new_users_this_week = (
        db.query(func.count(DBUser.id))
        .filter(DBUser.created_at >= one_week_ago)
        .scalar()
    )

    # Count by role
    students = db.query(func.count(DBUser.id)).filter(DBUser.role == "student").scalar()
    admins = db.query(func.count(DBUser.id)).filter(DBUser.role == "admin").scalar()
    teachers = db.query(func.count(DBUser.id)).filter(DBUser.role == "teacher").scalar()

    return {
        "total_users": total_users,
        "new_users_this_week": new_users_this_week,
        "roles": {
            "students": students,
            "admins": admins,
            "teachers": teachers,
        }
    }
