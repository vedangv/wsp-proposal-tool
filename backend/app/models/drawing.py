import uuid
import enum
from sqlalchemy import Column, String, Date, ForeignKey, DateTime, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class DrawingFormat(str, enum.Enum):
    pdf = "pdf"
    dwg = "dwg"
    revit = "revit"
    other = "other"


class DrawingStatus(str, enum.Enum):
    tbd = "tbd"
    in_progress = "in_progress"
    complete = "complete"


class Drawing(Base):
    __tablename__ = "drawings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False, index=True)
    wbs_id = Column(UUID(as_uuid=True), ForeignKey("wbs_items.id", ondelete="SET NULL"), nullable=True)
    deliverable_id = Column(UUID(as_uuid=True), ForeignKey("deliverables.id", ondelete="SET NULL"), nullable=True)
    drawing_number = Column(String)
    title = Column(String, nullable=False)
    discipline = Column(String)
    scale = Column(String)
    format = Column(Enum(DrawingFormat), default=DrawingFormat.pdf)
    due_date = Column(Date)
    responsible_party = Column(String)
    revision = Column(String)
    status = Column(Enum(DrawingStatus), default=DrawingStatus.tbd)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
