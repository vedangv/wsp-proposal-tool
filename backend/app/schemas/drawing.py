from typing import Optional
from datetime import date
from uuid import UUID
from pydantic import BaseModel
from app.models.drawing import DrawingFormat, DrawingStatus


class DrawingCreate(BaseModel):
    wbs_id: Optional[UUID] = None
    deliverable_id: Optional[UUID] = None
    drawing_number: Optional[str] = None
    title: str
    discipline: Optional[str] = None
    scale: Optional[str] = None
    format: DrawingFormat = DrawingFormat.pdf
    due_date: Optional[date] = None
    responsible_party: Optional[str] = None
    revision: Optional[str] = None
    status: DrawingStatus = DrawingStatus.tbd


class DrawingUpdate(BaseModel):
    wbs_id: Optional[UUID] = None
    deliverable_id: Optional[UUID] = None
    drawing_number: Optional[str] = None
    title: Optional[str] = None
    discipline: Optional[str] = None
    scale: Optional[str] = None
    format: Optional[DrawingFormat] = None
    due_date: Optional[date] = None
    responsible_party: Optional[str] = None
    revision: Optional[str] = None
    status: Optional[DrawingStatus] = None


class DrawingOut(BaseModel):
    id: UUID
    proposal_id: UUID
    wbs_id: Optional[UUID]
    deliverable_id: Optional[UUID]
    drawing_number: Optional[str]
    title: str
    discipline: Optional[str]
    scale: Optional[str]
    format: DrawingFormat
    due_date: Optional[date]
    responsible_party: Optional[str]
    revision: Optional[str]
    status: DrawingStatus

    model_config = {"from_attributes": True}
