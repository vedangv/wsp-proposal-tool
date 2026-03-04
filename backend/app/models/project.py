import uuid
from sqlalchemy import Column, String, Text, Numeric, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_number = Column(String, unique=True, nullable=True)
    project_name = Column(String, nullable=False)
    client = Column(String, nullable=True)
    location = Column(String, nullable=True)
    contract_value = Column(Numeric(precision=14, scale=2), nullable=True)
    year_completed = Column(String, nullable=True)
    status = Column(String, nullable=False, server_default="completed")
    wsp_role = Column(String, nullable=True)
    project_manager = Column(String, nullable=True)
    sector = Column(String, nullable=True)
    services_performed = Column(Text, nullable=True)
    key_personnel = Column(JSONB, nullable=False, default=list, server_default="[]")
    description = Column(Text, nullable=True)
    outcomes = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
