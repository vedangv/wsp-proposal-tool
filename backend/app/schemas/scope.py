from typing import Optional
from uuid import UUID
from pydantic import BaseModel


class ScopeSectionCreate(BaseModel):
    section_name: str
    content: str = ""
    order_index: int = 0


class ScopeSectionUpdate(BaseModel):
    section_name: Optional[str] = None
    content: Optional[str] = None
    order_index: Optional[int] = None


class ScopeSectionOut(BaseModel):
    id: UUID
    proposal_id: UUID
    section_name: str
    content: str
    order_index: int

    model_config = {"from_attributes": True}
