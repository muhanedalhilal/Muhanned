from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from app.models.user import UserSignup
from app.database.database import get_db
from app.models.db_user import DBUser
from app.core.security import get_current_user
from app.core.supabase_client import supabase

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(user: UserSignup, db: Session = Depends(get_db)):
    try:
        # 1. Create user in Supabase securely
        response = supabase.auth.sign_up({
            "email": user.email,
            "password": user.password,
            "options": {
                "data": {"name": user.name}
            }
        })
        
        # Ensure user was created properly
        if not response.user:
            raise HTTPException(status_code=400, detail="Supabase user creation failed.")
            
        try:
            # 2. Save the matching profile to our PostgreSQL Database table!
            new_db_user = DBUser(
                supabase_auth_id=response.user.id,
                name=user.name,
                email=user.email,
                role="student"
            )
            db.add(new_db_user)
            db.commit()
            db.refresh(new_db_user)
            
        except Exception as db_error:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database insert failed: {str(db_error)}"
            )

        return {
            "message": "User created super fast in Supabase & our PostgreSQL DB!",
            "uid": response.user.id,
            "email": response.user.email,
            "name": response.user.user_metadata.get("name") if response.user.user_metadata else user.name,
            "database_id": new_db_user.id
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Auth error: {str(e)}"
        )


@router.get("/me")
def get_my_profile(current_user: DBUser = Depends(get_current_user)):
    """
    This is a securely locked route. 
    It will ONLY execute if the user provides a valid Supabase Access Token.
    """
    return {
        "message": "You verified your token and accessed a protected route!",
        "database_id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "user_role": current_user.role
    }
