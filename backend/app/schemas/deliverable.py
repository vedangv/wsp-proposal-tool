from typing import Optional
from datetime import date
from uuid import UUID
from pydantic import BaseModel
from app.models.deliverable import DeliverableType, DeliverableStatus


class DeliverableCreate(BaseModel):
    wbs_id: Optional[UUID] = None
    deliverable_ref: Optional[str] = None
    title: str
    type: DeliverableType = DeliverableType.other
    description: Optional[str] = None
    due_date: Optional[date] = None
    responsible_party: Optional[str] = None
    status: DeliverableStatus = DeliverableStatus.tbd


class DeliverableUpdate(BaseModel):
    wbs_id: Optional[UUID] = None
    deliverable_ref: Optional[str] = None
    title: Optional[str] = None
    type: Optional[DeliverableType] = None
    description: Optional[str] = None
    due_date: Optional[date] = None
    responsible_party: Optional[str] = None
    status: Optional[DeliverableStatus] = None


class DeliverableOut(BaseModel):
    id: UUID
    proposal_id: UUID
    wbs_id: Optional[UUID]
    deliverable_ref: Optional[str]
    title: str
    type: DeliverableType
    description: Optional[str]
    due_date: Optional[date]
    responsible_party: Optional[str]
    status: DeliverableStatus

    model_config = {"from_attributes": True}
