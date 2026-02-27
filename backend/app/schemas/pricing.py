from typing import Optional
from uuid import UUID
from pydantic import BaseModel


class PricingRowCreate(BaseModel):
    wbs_id: Optional[UUID] = None
    role_title: Optional[str] = None
    staff_name: Optional[str] = None
    grade: Optional[str] = None
    hourly_rate: float = 0
    hours_by_phase: dict = {}


class PricingRowUpdate(BaseModel):
    wbs_id: Optional[UUID] = None
    role_title: Optional[str] = None
    staff_name: Optional[str] = None
    grade: Optional[str] = None
    hourly_rate: Optional[float] = None
    hours_by_phase: Optional[dict] = None


class PricingRowOut(BaseModel):
    id: UUID
    proposal_id: UUID
    wbs_id: Optional[UUID]
    role_title: Optional[str]
    staff_name: Optional[str]
    grade: Optional[str]
    hourly_rate: float
    hours_by_phase: dict
    total_hours: float
    total_cost: float

    model_config = {"from_attributes": True}
