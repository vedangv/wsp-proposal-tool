from typing import Optional
from datetime import date
from uuid import UUID
from pydantic import BaseModel


class ScheduleItemCreate(BaseModel):
    wbs_id: Optional[UUID] = None
    task_name: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    responsible_party: Optional[str] = None
    is_milestone: bool = False
    phase: Optional[str] = None


class ScheduleItemUpdate(BaseModel):
    wbs_id: Optional[UUID] = None
    task_name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    responsible_party: Optional[str] = None
    is_milestone: Optional[bool] = None
    phase: Optional[str] = None


class ScheduleItemOut(BaseModel):
    id: UUID
    proposal_id: UUID
    wbs_id: Optional[UUID]
    task_name: str
    start_date: Optional[date]
    end_date: Optional[date]
    responsible_party: Optional[str]
    is_milestone: bool
    phase: Optional[str]

    model_config = {"from_attributes": True}
