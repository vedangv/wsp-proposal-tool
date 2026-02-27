from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.wbs import WBSItem
from app.models.user import User
from app.schemas.wbs import WBSItemCreate, WBSItemUpdate, WBSItemOut
from app.auth.deps import get_current_user
from typing import List
import uuid

router = APIRouter(prefix="/api/proposals/{proposal_id}/wbs", tags=["wbs"])


def _to_out(item: WBSItem) -> WBSItemOut:
    hours = item.hours or 0
    rate = item.unit_rate or 0
    return WBSItemOut(
        id=item.id,
        proposal_id=item.proposal_id,
        wbs_code=item.wbs_code,
        description=item.description,
        phase=item.phase,
        hours=hours,
        unit_rate=rate,
        total_cost=hours * rate,
        order_index=item.order_index or 0,
    )


@router.get("/", response_model=List[WBSItemOut])
async def list_wbs(
    proposal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WBSItem)
        .where(WBSItem.proposal_id == proposal_id)
        .order_by(WBSItem.order_index, WBSItem.wbs_code)
    )
    return [_to_out(i) for i in result.scalars().all()]


@router.post("/", response_model=WBSItemOut, status_code=201)
async def create_wbs_item(
    proposal_id: uuid.UUID,
    body: WBSItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = WBSItem(**body.model_dump(), proposal_id=proposal_id, updated_by=current_user.id)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return _to_out(item)


@router.patch("/{item_id}", response_model=WBSItemOut)
async def update_wbs_item(
    proposal_id: uuid.UUID,
    item_id: uuid.UUID,
    body: WBSItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WBSItem).where(WBSItem.id == item_id, WBSItem.proposal_id == proposal_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(item, field, value)
    item.updated_by = current_user.id
    await db.commit()
    await db.refresh(item)
    return _to_out(item)


@router.delete("/{item_id}", status_code=204)
async def delete_wbs_item(
    proposal_id: uuid.UUID,
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WBSItem).where(WBSItem.id == item_id, WBSItem.proposal_id == proposal_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404)
    await db.delete(item)
    await db.commit()


@router.get("/{item_id}/links")
async def get_wbs_links(
    proposal_id: uuid.UUID,
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns count of items in other tables referencing this WBS item."""
    from sqlalchemy import func, union_all, literal
    from app.models.pricing import PricingRow
    from app.models.schedule import ScheduleItem
    from app.models.deliverable import Deliverable
    from app.models.drawing import Drawing

    counts = {}
    for model, name in [
        (PricingRow, "pricing"),
        (ScheduleItem, "schedule"),
        (Deliverable, "deliverables"),
        (Drawing, "drawings"),
    ]:
        res = await db.execute(
            select(func.count()).where(model.wbs_id == item_id)
        )
        counts[name] = res.scalar()

    return {"total": sum(counts.values()), "counts": counts}
