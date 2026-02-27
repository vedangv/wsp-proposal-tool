from pydantic import BaseModel
from enum import Enum
from datetime import datetime
from typing import Optional
import uuid


class ProposalStatus(str, Enum):
    draft = "draft"
    in_review = "in_review"
    submitted = "submitted"


class ProposalCreate(BaseModel):
    proposal_number: str
    title: str
    client_name: Optional[str] = None
    status: ProposalStatus = ProposalStatus.draft


class ProposalUpdate(BaseModel):
    title: Optional[str] = None
    client_name: Optional[str] = None
    status: Optional[ProposalStatus] = None


class ProposalOut(BaseModel):
    id: uuid.UUID
    proposal_number: str
    title: str
    client_name: Optional[str]
    status: ProposalStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
