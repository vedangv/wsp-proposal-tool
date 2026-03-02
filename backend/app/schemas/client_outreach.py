from typing import Optional
from uuid import UUID
from datetime import date
from enum import Enum
from pydantic import BaseModel


class OutreachType(str, Enum):
    call = "call"
    email = "email"
    meeting = "meeting"
    presentation = "presentation"
    site_visit = "site_visit"
    other = "other"


class ClientOutreachCreate(BaseModel):
    outreach_date: date
    outreach_type: OutreachType
    contact_name: Optional[str] = None
    contact_role: Optional[str] = None
    notes: Optional[str] = None


class ClientOutreachUpdate(BaseModel):
    outreach_date: Optional[date] = None
    outreach_type: Optional[OutreachType] = None
    contact_name: Optional[str] = None
    contact_role: Optional[str] = None
    notes: Optional[str] = None


class ClientOutreachOut(BaseModel):
    id: UUID
    proposal_id: UUID
    outreach_date: date
    outreach_type: str
    contact_name: Optional[str]
    contact_role: Optional[str]
    notes: Optional[str]

    model_config = {"from_attributes": True}
