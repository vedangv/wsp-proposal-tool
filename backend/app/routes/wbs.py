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


def _compute_wbs_totals(
    items: list[WBSItem],
    pricing_hours: dict[uuid.UUID, float],
    pricing_cost: dict[uuid.UUID, float],
) -> dict[uuid.UUID, tuple[float, float]]:
    """
    For each WBS item, return (total_hours, total_cost) including all descendants.
    pricing_hours/pricing_cost are keyed by wbs_id (direct only).
    Rollup: a parent's total = sum of its own direct pricing + all children's totals.
    """
    # Sort by WBS code so parents always come before children
    sorted_items = sorted(items, key=lambda i: i.wbs_code)
    code_to_id = {i.wbs_code: i.id for i in sorted_items}

    # Start with direct pricing totals
    totals: dict[uuid.UUID, list[float]] = {
        i.id: [pricing_hours.get(i.id, 0.0), pricing_cost.get(i.id, 0.0)]
        for i in sorted_items
    }

    # Roll up in reverse order (children first)
    for item in reversed(sorted_items):
        parts = item.wbs_code.split(".")
        if len(parts) > 1:
            parent_code = ".".join(parts[:-1])
            parent_id = code_to_id.get(parent_code)
            if parent_id:
                totals[parent_id][0] += totals[item.id][0]
                totals[parent_id][1] += totals[item.id][1]

    return {k: (v[0], v[1]) for k, v in totals.items()}


async def _build_pricing_maps(
    proposal_id: uuid.UUID, db: AsyncSession
) -> tuple[dict[uuid.UUID, float], dict[uuid.UUID, float]]:
    """Return (hours_by_wbs_id, cost_by_wbs_id) from direct pricing rows."""
    from app.models.pricing import PricingRow

    result = await db.execute(
        select(PricingRow).where(
            PricingRow.proposal_id == proposal_id,
            PricingRow.wbs_id.isnot(None),
        )
    )
    rows = result.scalars().all()

    hours_map: dict[uuid.UUID, float] = {}
    cost_map: dict[uuid.UUID, float] = {}
    for row in rows:
        phases = row.hours_by_phase or {}
        h = sum(float(v) for v in phases.values())
        c = h * float(row.hourly_rate or 0)
        hours_map[row.wbs_id] = hours_map.get(row.wbs_id, 0.0) + h
        cost_map[row.wbs_id] = cost_map.get(row.wbs_id, 0.0) + c

    return hours_map, cost_map


def _to_out(item: WBSItem, total_hours: float, total_cost: float) -> WBSItemOut:
    return WBSItemOut(
        id=item.id,
        proposal_id=item.proposal_id,
        wbs_code=item.wbs_code,
        description=item.description,
        phase=item.phase,
        total_hours=total_hours,
        total_cost=total_cost,
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
    items = result.scalars().all()

    hours_map, cost_map = await _build_pricing_maps(proposal_id, db)
    totals = _compute_wbs_totals(items, hours_map, cost_map)

    return [_to_out(i, *totals.get(i.id, (0.0, 0.0))) for i in items]


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
    return _to_out(item, 0.0, 0.0)


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

    # Recompute totals after update
    all_items_result = await db.execute(
        select(WBSItem).where(WBSItem.proposal_id == proposal_id)
    )
    all_items = all_items_result.scalars().all()
    hours_map, cost_map = await _build_pricing_maps(proposal_id, db)
    totals = _compute_wbs_totals(all_items, hours_map, cost_map)
    return _to_out(item, *totals.get(item.id, (0.0, 0.0)))


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
    from sqlalchemy import func
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
