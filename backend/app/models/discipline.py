import uuid
import enum
from sqlalchemy import Column, String, Integer, Text, Enum, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class DisciplineStatus(str, enum.Enum):
    not_contacted = "not_contacted"
    contacted = "contacted"
    confirmed = "confirmed"
    declined = "declined"


class ProposalDiscipline(Base):
    __tablename__ = "proposal_disciplines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False, index=True)
    discipline_name = Column(String, nullable=False)
    contact_name = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    status = Column(String, nullable=False, default="not_contacted")
    notes = Column(Text, nullable=True)
    order_index = Column(Integer, nullable=False, default=0)
    updated_by = Column(String, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
