from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.deps import get_current_user
from app.models.schedule import ScheduleItem
from app.models.user import User
from app.schemas.schedule import ScheduleItemCreate, ScheduleItemUpdate, ScheduleItemOut

router = APIRouter(prefix="/api/proposals/{proposal_id}/schedule", tags=["schedule"])


@router.get("/", response_model=List[ScheduleItemOut])
async def list_schedule(
    proposal_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ScheduleItem)
        .where(ScheduleItem.proposal_id == proposal_id)
        .order_by(ScheduleItem.start_date.nulls_last(), ScheduleItem.updated_at)
    )
    return result.scalars().all()


@router.post("/", response_model=ScheduleItemOut, status_code=201)
async def create_schedule_item(
    proposal_id: UUID,
    body: ScheduleItemCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    item = ScheduleItem(
        proposal_id=proposal_id,
        wbs_id=body.wbs_id,
        task_name=body.task_name,
        start_date=body.start_date,
        end_date=body.end_date,
        responsible_party=body.responsible_party,
        is_milestone=body.is_milestone,
        phase=body.phase,
        updated_by=user.id,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.patch("/{item_id}", response_model=ScheduleItemOut)
async def update_schedule_item(
    proposal_id: UUID,
    item_id: UUID,
    body: ScheduleItemUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ScheduleItem).where(
            ScheduleItem.id == item_id, ScheduleItem.proposal_id == proposal_id
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Schedule item not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    item.updated_by = user.id
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
async def delete_schedule_item(
    proposal_id: UUID,
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ScheduleItem).where(
            ScheduleItem.id == item_id, ScheduleItem.proposal_id == proposal_id
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Schedule item not found")
    await db.delete(item)
    await db.commit()
