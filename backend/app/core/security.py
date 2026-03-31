from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.db_user import DBUser
from app.core.supabase_client import supabase

# This forces the requester to present an "Authorization: Bearer <token>" header
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """
    Supabase 'Bouncer'. Blocks unauthorized requests automatically.
    """
    token = credentials.credentials
    try:
        # 1. Provide the token to Supabase and ask "Who is this?"
        response = supabase.auth.get_user(token)
        
        if not response or not response.user:
            raise Exception("Invalid Supabase token")

        uid = response.user.id

        # 2. Ask PostgreSQL: "Do we have this valid user stored in our database?"
        user = db.query(DBUser).filter(DBUser.supabase_auth_id == uid).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="User found in Supabase but completely missing from our PostgreSQL 'users' table!"
            )
            
        # 3. Success! Return the full SQL user!
        return user

    except Exception as e:
        # Faked, expired, or invalid token gets instantly rejected
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or Expired Authentication Token. ({str(e)})"
        )
