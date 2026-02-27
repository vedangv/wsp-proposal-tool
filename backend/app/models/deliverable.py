import uuid
import enum
from sqlalchemy import Column, String, Text, Date, ForeignKey, DateTime, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class DeliverableType(str, enum.Enum):
    report = "report"
    model = "model"
    specification = "specification"
    drawing_package = "drawing_package"
    other = "other"


class DeliverableStatus(str, enum.Enum):
    tbd = "tbd"
    in_progress = "in_progress"
    complete = "complete"


class Deliverable(Base):
    __tablename__ = "deliverables"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False, index=True)
    wbs_id = Column(UUID(as_uuid=True), ForeignKey("wbs_items.id", ondelete="SET NULL"), nullable=True)
    deliverable_ref = Column(String)
    title = Column(String, nullable=False)
    type = Column(Enum(DeliverableType), default=DeliverableType.other)
    description = Column(Text)
    due_date = Column(Date)
    responsible_party = Column(String)
    status = Column(Enum(DeliverableStatus), default=DeliverableStatus.tbd)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
