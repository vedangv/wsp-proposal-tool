import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class ProposedPerson(Base):
    __tablename__ = "proposed_people"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_name = Column(String, nullable=False)
    employee_id = Column(String)
    role_on_project = Column(String)
    years_experience = Column(Integer)
    cv_path = Column(String, nullable=True)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
