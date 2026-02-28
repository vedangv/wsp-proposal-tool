from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.deps import get_current_user
from app.models.relevant_project import RelevantProject
from app.models.user import User
from app.schemas.relevant_project import RelevantProjectCreate, RelevantProjectUpdate, RelevantProjectOut

router = APIRouter(prefix="/api/proposals/{proposal_id}/relevant-projects", tags=["relevant-projects"])


@router.get("/", response_model=List[RelevantProjectOut])
async def list_relevant_projects(
    proposal_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(RelevantProject)
        .where(RelevantProject.proposal_id == proposal_id)
        .order_by(RelevantProject.updated_at)
    )
    return result.scalars().all()


@router.post("/", response_model=RelevantProjectOut, status_code=201)
async def create_relevant_project(
    proposal_id: UUID,
    body: RelevantProjectCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    p = RelevantProject(
        proposal_id=proposal_id,
        updated_by=user.id,
        **body.model_dump(),
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p


@router.patch("/{project_id}", response_model=RelevantProjectOut)
async def update_relevant_project(
    proposal_id: UUID,
    project_id: UUID,
    body: RelevantProjectUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(RelevantProject).where(
            RelevantProject.id == project_id,
            RelevantProject.proposal_id == proposal_id,
        )
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Relevant project not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(p, field, value)
    p.updated_by = user.id
    await db.commit()
    await db.refresh(p)
    return p


@router.delete("/{project_id}", status_code=204)
async def delete_relevant_project(
    proposal_id: UUID,
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(RelevantProject).where(
            RelevantProject.id == project_id,
            RelevantProject.proposal_id == proposal_id,
        )
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Relevant project not found")
    await db.delete(p)
    await db.commit()
