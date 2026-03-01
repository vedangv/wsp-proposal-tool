from pydantic import BaseModel
from typing import Optional


class DashboardOut(BaseModel):
    # Financial
    total_billing: float
    total_cost: float
    total_burdened: float
    net_margin: float
    margin_pct: float
    achieved_dlm: float
    target_dlm: float
    # Sizing
    team_size: int
    total_hours: float
    # Schedule
    schedule_start: Optional[str]
    schedule_end: Optional[str]
    # Tab counts
    wbs_count: int
    pricing_count: int
    people_count: int
    schedule_count: int
    deliverables_count: int
    drawings_count: int
    scope_count: int
    relevant_projects_count: int
