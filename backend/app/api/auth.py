from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from app.models.user import UserSignup, UserLogin
from app.database.database import get_db
from app.models.db_user import DBUser
from app.core.security import get_current_user
from app.core.supabase_client import supabase, supabase_admin

router = APIRouter(prefix="/auth", tags=["auth"])

class ForgotPasswordRequest(BaseModel):
    email: str
    redirect_url: Optional[str] = None

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
            error_msg = str(db_error)
            if "ix_users_email" in error_msg or "UniqueViolation" in error_msg:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="An account with this email address already exists. Please log in instead."
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An unexpected error occurred during account creation. Please try again."
            )

        return {
            "message": "Account created successfully! Please check your email to verify your account before signing in.",
            "uid": response.user.id,
            "email": response.user.email,
            "name": response.user.user_metadata.get("name") if response.user.user_metadata else user.name,
            "database_id": new_db_user.id
        }
        
    except HTTPException:
        # Re-raise standard HTTPExceptions to prevent wrapping them in another error
        raise
    except Exception as e:
        error_msg = str(e)
        if "User already registered" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists. Please log in instead."
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Authentication failed: {error_msg}"
        )

@router.post("/login")
def login(user: UserLogin):
    try:
        # Supabase inherently checks if the user/password is correct!
        response = supabase.auth.sign_in_with_password({
            "email": user.email,
            "password": user.password
        })
        
        # If it succeeds, grab the mighty "access token"
        session = response.session
        if not session:
            raise HTTPException(status_code=400, detail="Invalid login credentials")
            
        return {
            "message": "Login successful!",
            "access_token": session.access_token,
            "token_type": "bearer",
            "user_id": response.user.id
        }
        
    except Exception as e:
        # Prevent hackers or mistakes by responding strongly
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password, or user doesn't exist."
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

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest):
    """
    Sends a password recovery email using Supabase admin API.
    """
    try:
        redirect_url = req.redirect_url or "http://localhost:5173/?page=reset-password"
        
        # Use the standard auth method to send a password reset email directly
        supabase.auth.reset_password_for_email(
            req.email,
            {"redirect_to": redirect_url}
        )
        
        return {"message": "Password reset email sent."}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Forgot password failed: {str(e)}"
        )
