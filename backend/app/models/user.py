from pydantic import BaseModel, EmailStr, Field, field_validator
import re

class UserSignup(BaseModel):
    name: str = Field(..., min_length=2, description="The user's full name")
    email: EmailStr = Field(..., description="The user's email address")
    password: str = Field(..., min_length=6, description="The user's password")
    role: str = Field("student", description="The user's role (student or teacher)")

    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one capital letter.")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number.")
        if not re.search(r"[!@#$%^&*()_+{}:\"<>?~`\-=\[\]\\;',./]", v):
            raise ValueError("Password must contain at least one special character.")
        return v

class UserLogin(BaseModel):
    email: EmailStr = Field(..., description="The user's email address")
    password: str = Field(..., description="The user's password")
