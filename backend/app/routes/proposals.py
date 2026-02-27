from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.proposal import Proposal
from app.models.user import User
from app.schemas.proposal import ProposalCreate, ProposalUpdate, ProposalOut
from app.auth.deps import get_current_user
from typing import List
import uuid

router = APIRouter(prefix="/api/proposals", tags=["proposals"])


@router.get("/", response_model=List[ProposalOut])
async def list_proposals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Proposal).order_by(Proposal.created_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=ProposalOut, status_code=201)
async def create_proposal(
    body: ProposalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proposal = Proposal(**body.model_dump(), created_by=current_user.id)
    db.add(proposal)
    await db.commit()
    await db.refresh(proposal)
    return proposal


@router.get("/{proposal_id}", response_model=ProposalOut)
async def get_proposal(
    proposal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Proposal).where(Proposal.id == proposal_id))
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return proposal


@router.patch("/{proposal_id}", response_model=ProposalOut)
async def update_proposal(
    proposal_id: uuid.UUID,
    body: ProposalUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Proposal).where(Proposal.id == proposal_id))
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(proposal, field, value)
    await db.commit()
    await db.refresh(proposal)
    return proposal
