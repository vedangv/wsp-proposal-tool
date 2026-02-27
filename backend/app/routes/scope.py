from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.deps import get_current_user
from app.models.scope import ScopeSection
from app.models.user import User
from app.schemas.scope import ScopeSectionCreate, ScopeSectionUpdate, ScopeSectionOut

router = APIRouter(prefix="/api/proposals/{proposal_id}/scope", tags=["scope"])

DEFAULT_SECTIONS = [
    "Executive Summary",
    "Project Background",
    "Scope of Work",
    "Exclusions",
    "Assumptions & Constraints",
    "Deliverables Summary",
]


async def _ensure_defaults(proposal_id: UUID, db: AsyncSession, user_id: UUID) -> None:
    result = await db.execute(
        select(ScopeSection).where(ScopeSection.proposal_id == proposal_id)
    )
    existing = {s.section_name for s in result.scalars().all()}
    for i, name in enumerate(DEFAULT_SECTIONS):
        if name not in existing:
            db.add(ScopeSection(
                proposal_id=proposal_id,
                section_name=name,
                content="",
                order_index=i,
                updated_by=user_id,
            ))
    await db.commit()


@router.get("/", response_model=List[ScopeSectionOut])
async def list_sections(
    proposal_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await _ensure_defaults(proposal_id, db, user.id)
    result = await db.execute(
        select(ScopeSection)
        .where(ScopeSection.proposal_id == proposal_id)
        .order_by(ScopeSection.order_index)
    )
    return result.scalars().all()


@router.patch("/{section_id}", response_model=ScopeSectionOut)
async def update_section(
    proposal_id: UUID,
    section_id: UUID,
    body: ScopeSectionUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ScopeSection).where(
            ScopeSection.id == section_id, ScopeSection.proposal_id == proposal_id
        )
    )
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(404, "Section not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(section, field, value)
    section.updated_by = user.id
    await db.commit()
    await db.refresh(section)
    return section


@router.post("/", response_model=ScopeSectionOut, status_code=201)
async def create_section(
    proposal_id: UUID,
    body: ScopeSectionCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    section = ScopeSection(
        proposal_id=proposal_id,
        section_name=body.section_name,
        content=body.content,
        order_index=body.order_index,
        updated_by=user.id,
    )
    db.add(section)
    await db.commit()
    await db.refresh(section)
    return section


@router.delete("/{section_id}", status_code=204)
async def delete_section(
    proposal_id: UUID,
    section_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ScopeSection).where(
            ScopeSection.id == section_id, ScopeSection.proposal_id == proposal_id
        )
    )
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(404, "Section not found")
    await db.delete(section)
    await db.commit()
