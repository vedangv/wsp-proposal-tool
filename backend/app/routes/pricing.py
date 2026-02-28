from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.deps import get_current_user
from app.models.pricing import PricingRow
from app.models.people import ProposedPerson
from app.models.user import User
from app.schemas.pricing import PricingRowCreate, PricingRowUpdate, PricingRowOut

router = APIRouter(prefix="/api/proposals/{proposal_id}/pricing", tags=["pricing"])


def _to_out(row: PricingRow, person: ProposedPerson | None = None) -> PricingRowOut:
    phases = row.hours_by_phase or {}
    total_hours = sum(float(v) for v in phases.values())
    total_cost = total_hours * float(row.hourly_rate or 0)
    return PricingRowOut(
        id=row.id,
        proposal_id=row.proposal_id,
        wbs_id=row.wbs_id,
        person_id=row.person_id,
        person_name=person.employee_name if person else None,
        person_wsp_role=person.wsp_role if person else None,
        person_team=person.team if person else None,
        hourly_rate=float(row.hourly_rate or 0),
        hours_by_phase=phases,
        total_hours=total_hours,
        total_cost=total_cost,
    )


@router.get("/", response_model=List[PricingRowOut])
async def list_pricing(
    proposal_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PricingRow)
        .where(PricingRow.proposal_id == proposal_id)
        .order_by(PricingRow.updated_at)
    )
    rows = result.scalars().all()

    # Fetch all relevant people in one query
    person_ids = [r.person_id for r in rows if r.person_id]
    people_map: dict[UUID, ProposedPerson] = {}
    if person_ids:
        ppl_result = await db.execute(
            select(ProposedPerson).where(ProposedPerson.id.in_(person_ids))
        )
        people_map = {p.id: p for p in ppl_result.scalars().all()}

    return [_to_out(r, people_map.get(r.person_id)) for r in rows]


@router.post("/", response_model=PricingRowOut, status_code=201)
async def create_pricing(
    proposal_id: UUID,
    body: PricingRowCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Auto-fill rate from person if person_id provided and rate not overridden
    rate = body.hourly_rate
    person = None
    if body.person_id:
        ppl_result = await db.execute(
            select(ProposedPerson).where(ProposedPerson.id == body.person_id)
        )
        person = ppl_result.scalar_one_or_none()
        if person and rate == 0:
            rate = float(person.hourly_rate or 0)

    row = PricingRow(
        proposal_id=proposal_id,
        wbs_id=body.wbs_id,
        person_id=body.person_id,
        hourly_rate=rate,
        hours_by_phase=body.hours_by_phase,
        updated_by=user.id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_out(row, person)


@router.patch("/{row_id}", response_model=PricingRowOut)
async def update_pricing(
    proposal_id: UUID,
    row_id: UUID,
    body: PricingRowUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PricingRow).where(
            PricingRow.id == row_id, PricingRow.proposal_id == proposal_id
        )
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Pricing row not found")

    updates = body.model_dump(exclude_unset=True)

    # If person changed and rate not explicitly set, refresh rate from new person
    if "person_id" in updates and "hourly_rate" not in updates and updates["person_id"]:
        ppl_result = await db.execute(
            select(ProposedPerson).where(ProposedPerson.id == updates["person_id"])
        )
        person = ppl_result.scalar_one_or_none()
        if person:
            updates["hourly_rate"] = float(person.hourly_rate or 0)

    for field, value in updates.items():
        setattr(row, field, value)
    row.updated_by = user.id
    await db.commit()
    await db.refresh(row)

    # Load person for response
    person = None
    if row.person_id:
        ppl_result = await db.execute(
            select(ProposedPerson).where(ProposedPerson.id == row.person_id)
        )
        person = ppl_result.scalar_one_or_none()

    return _to_out(row, person)


@router.delete("/{row_id}", status_code=204)
async def delete_pricing(
    proposal_id: UUID,
    row_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PricingRow).where(
            PricingRow.id == row_id, PricingRow.proposal_id == proposal_id
        )
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Pricing row not found")
    await db.delete(row)
    await db.commit()
