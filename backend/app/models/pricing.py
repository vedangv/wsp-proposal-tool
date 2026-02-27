import uuid
from sqlalchemy import Column, String, Numeric, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base import Base


class PricingRow(Base):
    __tablename__ = "pricing_rows"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False, index=True)
    wbs_id = Column(UUID(as_uuid=True), ForeignKey("wbs_items.id", ondelete="SET NULL"), nullable=True)
    role_title = Column(String)
    staff_name = Column(String)
    grade = Column(String)
    hourly_rate = Column(Numeric(10, 2), default=0)
    hours_by_phase = Column(JSONB, default=dict)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
