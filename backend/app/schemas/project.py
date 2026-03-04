from typing import Optional
from decimal import Decimal
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class ProjectCreate(BaseModel):
    project_number: Optional[str] = None
    project_name: str
    client: Optional[str] = None
    location: Optional[str] = None
    contract_value: Optional[Decimal] = None
    year_completed: Optional[str] = None
    status: Optional[str] = "completed"
    wsp_role: Optional[str] = None
    project_manager: Optional[str] = None
    sector: Optional[str] = None
    services_performed: Optional[str] = None
    key_personnel: Optional[list[dict]] = None
    description: Optional[str] = None
    outcomes: Optional[str] = None


class ProjectUpdate(BaseModel):
    project_number: Optional[str] = None
    project_name: Optional[str] = None
    client: Optional[str] = None
    location: Optional[str] = None
    contract_value: Optional[Decimal] = None
    year_completed: Optional[str] = None
    status: Optional[str] = None
    wsp_role: Optional[str] = None
    project_manager: Optional[str] = None
    sector: Optional[str] = None
    services_performed: Optional[str] = None
    key_personnel: Optional[list[dict]] = None
    description: Optional[str] = None
    outcomes: Optional[str] = None


class ProjectOut(BaseModel):
    id: UUID
    project_number: Optional[str]
    project_name: str
    client: Optional[str]
    location: Optional[str]
    contract_value: Optional[Decimal]
    year_completed: Optional[str]
    status: str
    wsp_role: Optional[str]
    project_manager: Optional[str]
    sector: Optional[str]
    services_performed: Optional[str]
    key_personnel: list[dict]
    description: Optional[str]
    outcomes: Optional[str]
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}
