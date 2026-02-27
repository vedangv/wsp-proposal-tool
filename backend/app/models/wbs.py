import uuid
from sqlalchemy import Column, String, Numeric, Integer, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class WBSItem(Base):
    __tablename__ = "wbs_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False, index=True)
    wbs_code = Column(String, nullable=False)
    description = Column(String)
    phase = Column(String)
    hours = Column(Numeric(10, 2), default=0)
    unit_rate = Column(Numeric(10, 2), default=0)
    order_index = Column(Integer, default=0)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
