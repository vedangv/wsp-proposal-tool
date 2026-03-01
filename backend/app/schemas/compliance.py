from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

DEFAULT_COMPLIANCE_ITEMS = [
    {"category": "Financial", "item_name": "Insurance Certificate"},
    {"category": "Financial", "item_name": "Bonding Requirements"},
    {"category": "Legal", "item_name": "Conflict of Interest Declaration"},
    {"category": "Legal", "item_name": "Teaming Agreements"},
    {"category": "Legal", "item_name": "Subconsultant Commitment Letters"},
    {"category": "Administrative", "item_name": "Certificate of Good Standing"},
    {"category": "Administrative", "item_name": "Security Clearance"},
    {"category": "Technical", "item_name": "AODA Compliance"},
]


class ComplianceCreate(BaseModel):
    item_name: str
    category: str
    status: str = "pending"
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    order_index: int = 0


class ComplianceUpdate(BaseModel):
    item_name: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    order_index: Optional[int] = None


class ComplianceOut(BaseModel):
    id: uuid.UUID
    proposal_id: uuid.UUID
    item_name: str
    category: str
    status: str
    assigned_to: Optional[str]
    notes: Optional[str]
    order_index: int
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}
