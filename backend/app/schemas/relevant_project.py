from typing import Optional
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel


class RelevantProjectCreate(BaseModel):
    project_name: str
    project_number: Optional[str] = None
    client: Optional[str] = None
    location: Optional[str] = None
    contract_value: Optional[Decimal] = None
    year_completed: Optional[str] = None
    wsp_role: Optional[str] = None
    project_manager: Optional[str] = None
    services_performed: Optional[str] = None
    relevance_notes: Optional[str] = None


class RelevantProjectUpdate(BaseModel):
    project_name: Optional[str] = None
    project_number: Optional[str] = None
    client: Optional[str] = None
    location: Optional[str] = None
    contract_value: Optional[Decimal] = None
    year_completed: Optional[str] = None
    wsp_role: Optional[str] = None
    project_manager: Optional[str] = None
    services_performed: Optional[str] = None
    relevance_notes: Optional[str] = None


class RelevantProjectOut(BaseModel):
    id: UUID
    proposal_id: UUID
    project_name: str
    project_number: Optional[str]
    client: Optional[str]
    location: Optional[str]
    contract_value: Optional[Decimal]
    year_completed: Optional[str]
    wsp_role: Optional[str]
    project_manager: Optional[str]
    services_performed: Optional[str]
    relevance_notes: Optional[str]

    model_config = {"from_attributes": True}
