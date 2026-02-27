from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.deps import get_current_user
from app.models.drawing import Drawing
from app.models.user import User
from app.schemas.drawing import DrawingCreate, DrawingUpdate, DrawingOut

router = APIRouter(prefix="/api/proposals/{proposal_id}/drawings", tags=["drawings"])


@router.get("/", response_model=List[DrawingOut])
async def list_drawings(
    proposal_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Drawing)
        .where(Drawing.proposal_id == proposal_id)
        .order_by(Drawing.drawing_number.nulls_last(), Drawing.updated_at)
    )
    return result.scalars().all()


@router.post("/", response_model=DrawingOut, status_code=201)
async def create_drawing(
    proposal_id: UUID,
    body: DrawingCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    d = Drawing(
        proposal_id=proposal_id,
        wbs_id=body.wbs_id,
        deliverable_id=body.deliverable_id,
        drawing_number=body.drawing_number,
        title=body.title,
        discipline=body.discipline,
        scale=body.scale,
        format=body.format,
        due_date=body.due_date,
        responsible_party=body.responsible_party,
        revision=body.revision,
        status=body.status,
        updated_by=user.id,
    )
    db.add(d)
    await db.commit()
    await db.refresh(d)
    return d


@router.patch("/{drawing_id}", response_model=DrawingOut)
async def update_drawing(
    proposal_id: UUID,
    drawing_id: UUID,
    body: DrawingUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Drawing).where(
            Drawing.id == drawing_id, Drawing.proposal_id == proposal_id
        )
    )
    d = result.scalar_one_or_none()
    if not d:
        raise HTTPException(404, "Drawing not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(d, field, value)
    d.updated_by = user.id
    await db.commit()
    await db.refresh(d)
    return d


@router.delete("/{drawing_id}", status_code=204)
async def delete_drawing(
    proposal_id: UUID,
    drawing_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Drawing).where(
            Drawing.id == drawing_id, Drawing.proposal_id == proposal_id
        )
    )
    d = result.scalar_one_or_none()
    if not d:
        raise HTTPException(404, "Drawing not found")
    await db.delete(d)
    await db.commit()
