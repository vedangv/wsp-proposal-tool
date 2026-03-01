from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.session import get_db
from app.auth.deps import get_current_user
from app.models.user import User
from app.models.discipline import ProposalDiscipline
from app.schemas.discipline import DisciplineCreate, DisciplineUpdate, DisciplineOut, STANDARD_DISCIPLINES

router = APIRouter(prefix="/api/proposals/{proposal_id}/disciplines", tags=["disciplines"])


@router.get("/", response_model=List[DisciplineOut])
async def list_disciplines(
    proposal_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ProposalDiscipline)
        .where(ProposalDiscipline.proposal_id == proposal_id)
        .order_by(ProposalDiscipline.order_index)
    )
    return result.scalars().all()


@router.post("/", response_model=DisciplineOut, status_code=201)
async def create_discipline(
    proposal_id: UUID,
    body: DisciplineCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = ProposalDiscipline(
        **body.model_dump(),
        proposal_id=proposal_id,
        updated_by=current_user.name,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.post("/init", response_model=List[DisciplineOut])
async def init_disciplines(
    proposal_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Initialize proposal with standard disciplines."""
    result = await db.execute(
        select(ProposalDiscipline).where(ProposalDiscipline.proposal_id == proposal_id)
    )
    existing = result.scalars().all()
    if existing:
        return existing

    items = []
    for i, name in enumerate(STANDARD_DISCIPLINES):
        item = ProposalDiscipline(
            proposal_id=proposal_id,
            discipline_name=name,
            order_index=i,
            updated_by=current_user.name,
        )
        db.add(item)
        items.append(item)
    await db.commit()
    for item in items:
        await db.refresh(item)
    return items


@router.patch("/{discipline_id}", response_model=DisciplineOut)
async def update_discipline(
    proposal_id: UUID,
    discipline_id: UUID,
    body: DisciplineUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ProposalDiscipline).where(
            ProposalDiscipline.id == discipline_id,
            ProposalDiscipline.proposal_id == proposal_id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Discipline not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(item, field, value)
    item.updated_by = current_user.name
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{discipline_id}", status_code=204)
async def delete_discipline(
    proposal_id: UUID,
    discipline_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ProposalDiscipline).where(
            ProposalDiscipline.id == discipline_id,
            ProposalDiscipline.proposal_id == proposal_id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Discipline not found")
    await db.delete(item)
    await db.commit()
