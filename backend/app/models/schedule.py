import uuid
from sqlalchemy import Column, String, Boolean, Date, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class ScheduleItem(Base):
    __tablename__ = "schedule_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False, index=True)
    wbs_id = Column(UUID(as_uuid=True), ForeignKey("wbs_items.id", ondelete="SET NULL"), nullable=True)
    task_name = Column(String, nullable=False)
    start_date = Column(Date)
    end_date = Column(Date)
    responsible_party = Column(String)
    is_milestone = Column(Boolean, default=False)
    phase = Column(String)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
