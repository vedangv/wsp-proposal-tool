from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import uuid


class TemplateWBSItem(BaseModel):
    wbs_code: str
    description: str
    phase: str = ""


class TemplateData(BaseModel):
    phases: list[str] = []
    target_dlm: float = 3.0
    wbs_items: list[TemplateWBSItem] = []


class ProposalTemplateOut(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    template_data: TemplateData
    created_at: datetime

    model_config = {"from_attributes": True}


class CreateFromTemplate(BaseModel):
    template_id: uuid.UUID
    proposal_number: str
    title: str
    client_name: Optional[str] = None
