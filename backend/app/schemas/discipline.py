from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

STANDARD_DISCIPLINES = [
    "Transportation",
    "Structural",
    "Environmental",
    "Geotechnical",
    "Electrical",
    "Mechanical",
    "Water Resources",
    "Survey",
    "Planning",
    "Architecture",
]


class DisciplineCreate(BaseModel):
    discipline_name: str
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    status: str = "not_contacted"
    notes: Optional[str] = None
    order_index: int = 0


class DisciplineUpdate(BaseModel):
    discipline_name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    order_index: Optional[int] = None


class DisciplineOut(BaseModel):
    id: uuid.UUID
    proposal_id: uuid.UUID
    discipline_name: str
    contact_name: Optional[str]
    contact_email: Optional[str]
    contact_phone: Optional[str]
    status: str
    notes: Optional[str]
    order_index: int
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}
