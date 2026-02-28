from pydantic import BaseModel
from typing import Optional
import uuid
from decimal import Decimal


class WBSItemCreate(BaseModel):
    wbs_code: str
    description: Optional[str] = None
    phase: Optional[str] = None
    order_index: int = 0


class WBSItemUpdate(BaseModel):
    wbs_code: Optional[str] = None
    description: Optional[str] = None
    phase: Optional[str] = None
    order_index: Optional[int] = None


class WBSItemOut(BaseModel):
    id: uuid.UUID
    proposal_id: uuid.UUID
    wbs_code: str
    description: Optional[str]
    phase: Optional[str]
    total_hours: float
    total_cost: float
    order_index: int = 0

    model_config = {"from_attributes": True}
