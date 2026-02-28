import uuid
from sqlalchemy import Column, String, Text, Numeric, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class RelevantProject(Base):
    __tablename__ = "relevant_projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False, index=True)
    project_name = Column(String, nullable=False)
    project_number = Column(String, nullable=True)
    client = Column(String, nullable=True)
    location = Column(String, nullable=True)
    contract_value = Column(Numeric(precision=14, scale=2), nullable=True)
    year_completed = Column(String, nullable=True)
    wsp_role = Column(String, nullable=True)
    project_manager = Column(String, nullable=True)
    services_performed = Column(Text, nullable=True)
    relevance_notes = Column(Text, nullable=True)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
