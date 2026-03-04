from typing import Optional
from uuid import UUID
from datetime import date, datetime
from pydantic import BaseModel


class LessonCreate(BaseModel):
    title: str
    description: Optional[str] = None
    source: str
    category: str
    impact: Optional[str] = "medium"
    recommendation: Optional[str] = None
    sector: Optional[str] = None
    disciplines: Optional[list[str]] = None
    client: Optional[str] = None
    region: Optional[str] = None
    project_id: Optional[UUID] = None
    proposal_id: Optional[UUID] = None
    reported_by: Optional[str] = None
    date_reported: Optional[date] = None


class LessonUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    source: Optional[str] = None
    category: Optional[str] = None
    impact: Optional[str] = None
    recommendation: Optional[str] = None
    sector: Optional[str] = None
    disciplines: Optional[list[str]] = None
    client: Optional[str] = None
    region: Optional[str] = None
    project_id: Optional[UUID] = None
    proposal_id: Optional[UUID] = None
    reported_by: Optional[str] = None
    date_reported: Optional[date] = None


class LessonOut(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    source: str
    category: str
    impact: str
    recommendation: Optional[str]
    sector: Optional[str]
    disciplines: list[str]
    client: Optional[str]
    region: Optional[str]
    project_id: Optional[UUID]
    proposal_id: Optional[UUID]
    reported_by: Optional[str]
    date_reported: Optional[date]
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}
