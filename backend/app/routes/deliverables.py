from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.deps import get_current_user
from app.models.deliverable import Deliverable
from app.models.drawing import Drawing
from app.models.user import User
from app.schemas.deliverable import DeliverableCreate, DeliverableUpdate, DeliverableOut

router = APIRouter(prefix="/api/proposals/{proposal_id}/deliverables", tags=["deliverables"])


@router.get("/", response_model=List[DeliverableOut])
async def list_deliverables(
    proposal_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Deliverable)
        .where(Deliverable.proposal_id == proposal_id)
        .order_by(Deliverable.deliverable_ref.nulls_last(), Deliverable.updated_at)
    )
    return result.scalars().all()


@router.post("/", response_model=DeliverableOut, status_code=201)
async def create_deliverable(
    proposal_id: UUID,
    body: DeliverableCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    d = Deliverable(
        proposal_id=proposal_id,
        wbs_id=body.wbs_id,
        deliverable_ref=body.deliverable_ref,
        title=body.title,
        type=body.type,
        description=body.description,
        due_date=body.due_date,
        responsible_party=body.responsible_party,
        status=body.status,
        updated_by=user.id,
    )
    db.add(d)
    await db.commit()
    await db.refresh(d)
    return d


@router.patch("/{deliverable_id}", response_model=DeliverableOut)
async def update_deliverable(
    proposal_id: UUID,
    deliverable_id: UUID,
    body: DeliverableUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Deliverable).where(
            Deliverable.id == deliverable_id, Deliverable.proposal_id == proposal_id
        )
    )
    d = result.scalar_one_or_none()
    if not d:
        raise HTTPException(404, "Deliverable not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(d, field, value)
    d.updated_by = user.id
    await db.commit()
    await db.refresh(d)
    return d


@router.delete("/{deliverable_id}", status_code=204)
async def delete_deliverable(
    proposal_id: UUID,
    deliverable_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Deliverable).where(
            Deliverable.id == deliverable_id, Deliverable.proposal_id == proposal_id
        )
    )
    d = result.scalar_one_or_none()
    if not d:
        raise HTTPException(404, "Deliverable not found")
    await db.delete(d)
    await db.commit()


@router.get("/{deliverable_id}/drawing-count")
async def drawing_count(
    proposal_id: UUID,
    deliverable_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(func.count()).where(
            Drawing.deliverable_id == deliverable_id,
            Drawing.proposal_id == proposal_id,
        )
    )
    return {"count": result.scalar() or 0}
