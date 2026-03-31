from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.db_user import DBUser

# This tells FastAPI that endpoints using this dependency require an "Authorization: Bearer <token>" header
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """
    This is our Bouncer function. 
    It stands guard on any route that requires a user to be logged in.
    """
    token = credentials.credentials
    try:
        # 1. Ask Firebase: "Is this a real, unexpired token?"
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token.get("uid")

        # 2. Assuming Firebase says YES, ask PostgreSQL: "Do we have this user saved?"
        user = db.query(DBUser).filter(DBUser.firebase_uid == uid).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="User found in Firebase but completely missing from PostgreSQL!"
            )
            
        # 3. Return the fully loaded PostgreSQL user out to the API route!
        return user

    except Exception as e:
        # If the token is fake, expired, or mangled, deny access!
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or Expired Authentication Token"
        )
