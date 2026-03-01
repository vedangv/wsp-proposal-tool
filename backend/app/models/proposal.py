import uuid
import enum
from sqlalchemy import Column, String, Float, Enum, DateTime, Date, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base import Base


class ProposalStatus(str, enum.Enum):
    draft = "draft"
    in_review = "in_review"
    submitted = "submitted"


class Proposal(Base):
    __tablename__ = "proposals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proposal_number = Column(String, unique=True, nullable=False, index=True)
    title = Column(String, nullable=False)
    client_name = Column(String)
    status = Column(Enum(ProposalStatus), nullable=False, default=ProposalStatus.draft)
    target_dlm = Column(Float, default=3.0)
    team_dlm_targets = Column(JSONB, default=dict)
    phases = Column(JSONB, default=lambda: ["Study", "Preliminary", "Detailed", "Tender", "Construction"])
    kickoff_date = Column(Date, nullable=True)
    red_review_date = Column(Date, nullable=True)
    gold_review_date = Column(Date, nullable=True)
    submission_deadline = Column(Date, nullable=True)
    check_in_meetings = Column(JSONB, default=list)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
