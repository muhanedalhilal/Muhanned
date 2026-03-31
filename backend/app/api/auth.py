from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import ValidationError
import firebase_admin
from firebase_admin import auth
from sqlalchemy.orm import Session

from app.models.user import UserSignup
from app.database.database import get_db
from app.models.db_user import DBUser
from app.core.security import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(user: UserSignup, db: Session = Depends(get_db)):
    try:
        # 1. Create user in Firebase securely
        user_record = auth.create_user(
            email=user.email,
            password=user.password,
            display_name=user.name
        )
        
        try:
            # 2. Save the matching profile to our own PostgreSQL Database
            new_db_user = DBUser(
                firebase_uid=user_record.uid,
                name=user.name,
                email=user.email,
                role="student"
            )
            db.add(new_db_user)
            db.commit()
            db.refresh(new_db_user)
            
        except Exception as db_error:
            # Rollback and clean up Firebase account if SQL fails!
            auth.delete_user(user_record.uid)
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database setup failed: {str(db_error)}"
            )

        return {
            "message": "User created successfully in Firebase & PostgreSQL!",
            "uid": user_record.uid,
            "email": user_record.email,
            "name": user_record.display_name,
            "database_id": new_db_user.id
        }
        
    except auth.EmailAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred: {str(e)}"
        )

@router.get("/me")
def get_my_profile(current_user: DBUser = Depends(get_current_user)):
    """
    This is a highly secure route. 
    It will ONLY run if the user holds a golden Firebase ID Token.
    """
    return {
        "message": "You have successfully accessed a secure route!",
        "database_id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "user_role": current_user.role
    }
