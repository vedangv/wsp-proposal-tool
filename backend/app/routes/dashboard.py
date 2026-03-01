from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.deps import get_current_user
from app.models.user import User
from app.models.proposal import Proposal
from app.models.wbs import WBSItem
from app.models.pricing import PricingRow
from app.models.people import ProposedPerson
from app.models.schedule import ScheduleItem
from app.models.deliverable import Deliverable
from app.models.drawing import Drawing
from app.models.scope import ScopeSection
from app.models.relevant_project import RelevantProject
from app.schemas.dashboard import DashboardOut

router = APIRouter(prefix="/api/proposals/{proposal_id}/dashboard", tags=["dashboard"])


@router.get("/", response_model=DashboardOut)
async def get_dashboard(
    proposal_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    # Proposal for target_dlm
    prop_result = await db.execute(select(Proposal).where(Proposal.id == proposal_id))
    proposal = prop_result.scalar_one_or_none()
    target_dlm = float(proposal.target_dlm or 3.0) if proposal else 3.0

    # Pricing rows with person join for burdened_rate
    pricing_result = await db.execute(
        select(PricingRow, ProposedPerson.burdened_rate)
        .outerjoin(ProposedPerson, PricingRow.person_id == ProposedPerson.id)
        .where(PricingRow.proposal_id == proposal_id)
    )
    pricing_data = pricing_result.all()

    total_billing = 0.0
    total_cost = 0.0
    total_burdened = 0.0
    total_hours = 0.0
    for row, burdened_rate in pricing_data:
        phases = row.hours_by_phase or {}
        h = sum(float(v) for v in phases.values())
        total_hours += h
        total_billing += h * float(row.hourly_rate or 0)
        total_cost += h * float(row.cost_rate or 0)
        total_burdened += h * float(burdened_rate or 0)

    net_margin = total_billing - total_cost
    margin_pct = (net_margin / total_billing * 100) if total_billing > 0 else 0.0
    achieved_dlm = (total_billing / total_cost) if total_cost > 0 else 0.0

    # Counts
    async def count_table(model, field="proposal_id"):
        result = await db.execute(
            select(func.count()).where(getattr(model, field) == proposal_id)
        )
        return result.scalar() or 0

    wbs_count = await count_table(WBSItem)
    pricing_count = len(pricing_data)
    people_count = await count_table(ProposedPerson)
    schedule_count = await count_table(ScheduleItem)
    deliverables_count = await count_table(Deliverable)
    drawings_count = await count_table(Drawing)
    scope_count = await count_table(ScopeSection)
    rp_count = await count_table(RelevantProject)

    # Schedule date range
    sched_result = await db.execute(
        select(
            func.min(ScheduleItem.start_date),
            func.max(ScheduleItem.end_date),
        ).where(ScheduleItem.proposal_id == proposal_id)
    )
    sched_row = sched_result.one()
    schedule_start = str(sched_row[0]) if sched_row[0] else None
    schedule_end = str(sched_row[1]) if sched_row[1] else None

    return DashboardOut(
        total_billing=round(total_billing, 2),
        total_cost=round(total_cost, 2),
        total_burdened=round(total_burdened, 2),
        net_margin=round(net_margin, 2),
        margin_pct=round(margin_pct, 1),
        achieved_dlm=round(achieved_dlm, 2),
        target_dlm=target_dlm,
        team_size=people_count,
        total_hours=round(total_hours, 1),
        schedule_start=schedule_start,
        schedule_end=schedule_end,
        wbs_count=wbs_count,
        pricing_count=pricing_count,
        people_count=people_count,
        schedule_count=schedule_count,
        deliverables_count=deliverables_count,
        drawings_count=drawings_count,
        scope_count=scope_count,
        relevant_projects_count=rp_count,
    )
