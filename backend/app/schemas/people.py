from typing import Optional
from uuid import UUID
from pydantic import BaseModel


class PersonCreate(BaseModel):
    employee_name: str
    employee_id: Optional[str] = None
    role_on_project: Optional[str] = None
    years_experience: Optional[int] = None
    cv_path: Optional[str] = None


class PersonUpdate(BaseModel):
    employee_name: Optional[str] = None
    employee_id: Optional[str] = None
    role_on_project: Optional[str] = None
    years_experience: Optional[int] = None
    cv_path: Optional[str] = None


class PersonOut(BaseModel):
    id: UUID
    proposal_id: UUID
    employee_name: str
    employee_id: Optional[str]
    role_on_project: Optional[str]
    years_experience: Optional[int]
    cv_path: Optional[str]

    model_config = {"from_attributes": True}
