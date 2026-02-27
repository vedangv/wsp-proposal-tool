from pydantic import BaseModel
from enum import Enum


class UserRole(str, Enum):
    pm = "pm"
    finance = "finance"
    admin = "admin"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: str
    password: str
