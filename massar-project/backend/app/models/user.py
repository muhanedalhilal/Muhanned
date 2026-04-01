from pydantic import BaseModel, EmailStr, Field

class UserSignup(BaseModel):
    name: str = Field(..., min_length=2, description="The user's full name")
    email: EmailStr = Field(..., description="The user's email address")
    password: str = Field(..., min_length=6, description="The user's password")

class UserLogin(BaseModel):
    email: EmailStr = Field(..., description="The user's email address")
    password: str = Field(..., description="The user's password")
