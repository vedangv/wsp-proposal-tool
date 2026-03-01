import uuid
from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base import Base


class ProposalTemplate(Base):
    __tablename__ = "proposal_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    template_data = Column(JSONB, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
