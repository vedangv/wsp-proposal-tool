import uuid
import enum
from sqlalchemy import Column, String, Text, Date, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class OutreachType(str, enum.Enum):
    call = "call"
    email = "email"
    meeting = "meeting"
    presentation = "presentation"
    site_visit = "site_visit"
    other = "other"


class ClientOutreach(Base):
    __tablename__ = "client_outreach"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False, index=True)
    outreach_date = Column(Date, nullable=False)
    outreach_type = Column(String, nullable=False)
    contact_name = Column(String, nullable=True)
    contact_role = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
