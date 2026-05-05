import os
import httpx
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.db_user import DBUser

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
DEV_AUTH_FALLBACK = os.getenv("MASSAR_DEV_AUTH_FALLBACK", "false").lower() in {"1", "true", "yes", "on"}

# This forces the requester to present an "Authorization: Bearer <token>" header
security = HTTPBearer()

def get_or_create_local_user_from_token(token: str, db: Session):
    """
    Local development fallback for when Supabase Auth is unreachable.
    This is enabled only with MASSAR_DEV_AUTH_FALLBACK=true.
    """
    try:
        payload = jwt.decode(token, options={"verify_signature": False, "verify_aud": False})
    except Exception:
        payload = {}

    uid = payload.get("sub") or payload.get("user_id") or "local-dev-user"
    email = payload.get("email") or f"{uid}@local.dev"
    metadata = payload.get("user_metadata") or {}
    name = metadata.get("name") or email.split("@")[0].capitalize()

    user = db.query(DBUser).filter(DBUser.supabase_auth_id == uid).first()
    if user:
        return user

    existing_by_email = db.query(DBUser).filter(DBUser.email == email).first()
    if existing_by_email:
        existing_by_email.supabase_auth_id = uid
        db.commit()
        db.refresh(existing_by_email)
        return existing_by_email

    user = DBUser(supabase_auth_id=uid, name=name, email=email, role="student")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """
    Validates the Supabase JWT via a direct HTTP call (bypasses supabase-py session issues).
    If the user is found in Supabase but missing from PostgreSQL, auto-creates them.
    """
    token = credentials.credentials
    try:
        # 1. Verify the JWT directly via Supabase REST API
        response = httpx.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": SUPABASE_KEY,
            },
            timeout=10.0
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid or expired token (Supabase status {response.status_code})."
            )

        sb_user = response.json()
        uid = sb_user.get("id")
        if not uid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not extract user ID from token."
            )

        # 2. Look up the user in our PostgreSQL database by Supabase UID
        user = db.query(DBUser).filter(DBUser.supabase_auth_id == uid).first()

        # 3. Auto-provision: if valid in Supabase but missing from PostgreSQL, create or fix now
        if not user:
            email = sb_user.get("email", "")
            metadata = sb_user.get("user_metadata") or {}
            name = metadata.get("name") or email.split("@")[0].capitalize()

            # Check if a record already exists by email (uid mismatch from re-signup)
            existing_by_email = db.query(DBUser).filter(DBUser.email == email).first()
            if existing_by_email:
                print(f"Updating supabase_auth_id for existing user: {email}")
                existing_by_email.supabase_auth_id = uid
                try:
                    db.commit()
                    db.refresh(existing_by_email)
                    user = existing_by_email
                except Exception as db_err:
                    db.rollback()
                    print(f"DB update error: {db_err}")
                    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update user record.")
            else:
                print(f"Auto-provisioning new PostgreSQL record for Supabase UID: {uid}")
                user = DBUser(supabase_auth_id=uid, name=name, email=email, role="student")
                db.add(user)
                try:
                    db.commit()
                    db.refresh(user)
                    print(f"Auto-provisioned user: {email}")
                except Exception as db_err:
                    db.rollback()
                    print(f"Auto-provision DB error: {db_err}")
                    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create user record in database.")

        return user

    except HTTPException:
        if DEV_AUTH_FALLBACK:
            print("Warning: Supabase auth unavailable. Using local dev auth fallback.")
            return get_or_create_local_user_from_token(token, db)
        raise
    except Exception as e:
        print(f"Authentication error: {e}")
        if DEV_AUTH_FALLBACK:
            print("Warning: Supabase auth unavailable. Using local dev auth fallback.")
            return get_or_create_local_user_from_token(token, db)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )


def require_admin(current_user: DBUser = Depends(get_current_user)):
    """
    Admin-only gate. Any route that depends on this will
    automatically reject non-admin users with a 403 Forbidden.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin privileges required."
        )
    return current_user
