import uuid
from sqlalchemy import Column, String, Text, Date, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base import Base


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    source = Column(String, nullable=False)
    category = Column(String, nullable=False)
    impact = Column(String, nullable=False, server_default="medium")
    recommendation = Column(Text, nullable=True)
    sector = Column(String, nullable=True)
    disciplines = Column(JSONB, nullable=False, default=list, server_default="[]")
    client = Column(String, nullable=True)
    region = Column(String, nullable=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("proposals.id", ondelete="SET NULL"), nullable=True, index=True)
    reported_by = Column(String, nullable=True)
    date_reported = Column(Date, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
