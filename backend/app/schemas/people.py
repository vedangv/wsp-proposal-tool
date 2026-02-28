from typing import Optional
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel


class PersonCreate(BaseModel):
    employee_name: str
    employee_id: Optional[str] = None
    wsp_role: Optional[str] = None
    team: Optional[str] = None
    role_on_project: Optional[str] = None
    hourly_rate: Optional[Decimal] = None
    years_experience: Optional[int] = None
    cv_path: Optional[str] = None


class PersonUpdate(BaseModel):
    employee_name: Optional[str] = None
    employee_id: Optional[str] = None
    wsp_role: Optional[str] = None
    team: Optional[str] = None
    role_on_project: Optional[str] = None
    hourly_rate: Optional[Decimal] = None
    years_experience: Optional[int] = None
    cv_path: Optional[str] = None


class PersonOut(BaseModel):
    id: UUID
    proposal_id: UUID
    employee_name: str
    employee_id: Optional[str]
    wsp_role: Optional[str]
    team: Optional[str]
    role_on_project: Optional[str]
    hourly_rate: Optional[Decimal]
    years_experience: Optional[int]
    cv_path: Optional[str]

    model_config = {"from_attributes": True}
