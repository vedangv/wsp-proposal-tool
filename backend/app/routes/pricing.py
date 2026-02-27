from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.deps import get_current_user
from app.models.pricing import PricingRow
from app.models.user import User
from app.schemas.pricing import PricingRowCreate, PricingRowUpdate, PricingRowOut

router = APIRouter(prefix="/api/proposals/{proposal_id}/pricing", tags=["pricing"])


def _to_out(row: PricingRow) -> PricingRowOut:
    phases = row.hours_by_phase or {}
    total_hours = sum(float(v) for v in phases.values())
    total_cost = total_hours * float(row.hourly_rate or 0)
    return PricingRowOut(
        id=row.id,
        proposal_id=row.proposal_id,
        wbs_id=row.wbs_id,
        role_title=row.role_title,
        staff_name=row.staff_name,
        grade=row.grade,
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
    return [_to_out(r) for r in result.scalars().all()]


@router.post("/", response_model=PricingRowOut, status_code=201)
async def create_pricing(
    proposal_id: UUID,
    body: PricingRowCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = PricingRow(
        proposal_id=proposal_id,
        wbs_id=body.wbs_id,
        role_title=body.role_title,
        staff_name=body.staff_name,
        grade=body.grade,
        hourly_rate=body.hourly_rate,
        hours_by_phase=body.hours_by_phase,
        updated_by=user.id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_out(row)


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
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    row.updated_by = user.id
    await db.commit()
    await db.refresh(row)
    return _to_out(row)


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
