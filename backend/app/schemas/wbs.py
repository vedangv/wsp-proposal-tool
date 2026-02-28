from pydantic import BaseModel
from typing import Optional
import uuid
from decimal import Decimal


class WBSItemCreate(BaseModel):
    wbs_code: str
    description: Optional[str] = None
    phase: Optional[str] = None
    hours: Decimal = Decimal("0")
    unit_rate: Decimal = Decimal("0")
    order_index: int = 0


class WBSItemUpdate(BaseModel):
    wbs_code: Optional[str] = None
    description: Optional[str] = None
    phase: Optional[str] = None
    hours: Optional[Decimal] = None
    unit_rate: Optional[Decimal] = None
    order_index: Optional[int] = None


class WBSItemOut(BaseModel):
    id: uuid.UUID
    proposal_id: uuid.UUID
    wbs_code: str
    description: Optional[str]
    phase: Optional[str]
    hours: float
    unit_rate: float
    total_cost: float
    order_index: int = 0

    model_config = {"from_attributes": True}
