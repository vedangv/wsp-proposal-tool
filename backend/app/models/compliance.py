import uuid
import enum
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class ComplianceStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    not_applicable = "not_applicable"


class ComplianceItem(Base):
    __tablename__ = "compliance_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False, index=True)
    item_name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    status = Column(String, nullable=False, default="pending")
    assigned_to = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    order_index = Column(Integer, nullable=False, default=0)
    updated_by = Column(String, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
