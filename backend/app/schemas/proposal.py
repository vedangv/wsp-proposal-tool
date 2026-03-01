from pydantic import BaseModel
from enum import Enum
from datetime import datetime, date
from typing import Optional
import uuid


class ProposalStatus(str, Enum):
    draft = "draft"
    in_review = "in_review"
    submitted = "submitted"


DEFAULT_PHASES = ["Study", "Preliminary", "Detailed", "Tender", "Construction"]


class CheckInMeeting(BaseModel):
    date: str
    notes: str = ""


class ProposalCreate(BaseModel):
    proposal_number: str
    title: str
    client_name: Optional[str] = None
    status: ProposalStatus = ProposalStatus.draft
    target_dlm: Optional[float] = 3.0
    team_dlm_targets: Optional[dict] = None
    phases: Optional[list[str]] = None
    kickoff_date: Optional[date] = None
    red_review_date: Optional[date] = None
    gold_review_date: Optional[date] = None
    submission_deadline: Optional[date] = None
    check_in_meetings: Optional[list[CheckInMeeting]] = None


class ProposalUpdate(BaseModel):
    title: Optional[str] = None
    client_name: Optional[str] = None
    status: Optional[ProposalStatus] = None
    target_dlm: Optional[float] = None
    team_dlm_targets: Optional[dict] = None
    phases: Optional[list[str]] = None
    kickoff_date: Optional[date] = None
    red_review_date: Optional[date] = None
    gold_review_date: Optional[date] = None
    submission_deadline: Optional[date] = None
    check_in_meetings: Optional[list[CheckInMeeting]] = None


class ProposalOut(BaseModel):
    id: uuid.UUID
    proposal_number: str
    title: str
    client_name: Optional[str]
    status: ProposalStatus
    target_dlm: Optional[float]
    team_dlm_targets: Optional[dict]
    phases: Optional[list[str]]
    kickoff_date: Optional[date]
    red_review_date: Optional[date]
    gold_review_date: Optional[date]
    submission_deadline: Optional[date]
    check_in_meetings: Optional[list] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
