from typing import Optional
from uuid import UUID
from pydantic import BaseModel


class PricingRowCreate(BaseModel):
    wbs_id: Optional[UUID] = None
    person_id: Optional[UUID] = None
    hourly_rate: float = 0
    hours_by_phase: dict = {}


class PricingRowUpdate(BaseModel):
    wbs_id: Optional[UUID] = None
    person_id: Optional[UUID] = None
    hourly_rate: Optional[float] = None
    hours_by_phase: Optional[dict] = None


class PricingRowOut(BaseModel):
    id: UUID
    proposal_id: UUID
    wbs_id: Optional[UUID]
    person_id: Optional[UUID]
    # Denormalised from person for display
    person_name: Optional[str]
    person_wsp_role: Optional[str]
    person_team: Optional[str]
    hourly_rate: float
    hours_by_phase: dict
    total_hours: float
    total_cost: float

    model_config = {"from_attributes": True}
