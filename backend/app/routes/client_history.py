from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.deps import get_current_user
from app.models.proposal import Proposal
from app.models.client_outreach import ClientOutreach
from app.models.user import User
from app.schemas.proposal import ProposalOut
from app.schemas.client_outreach import ClientOutreachCreate, ClientOutreachUpdate, ClientOutreachOut

router = APIRouter(prefix="/api/proposals/{proposal_id}/client-history", tags=["client-history"])


@router.get("/past-proposals", response_model=List[ProposalOut])
async def list_past_proposals(
    proposal_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Proposal).where(Proposal.id == proposal_id))
    current = result.scalar_one_or_none()
    if not current:
        raise HTTPException(404, "Proposal not found")
    if not current.client_name:
        return []

    result = await db.execute(
        select(Proposal)
        .where(
            func.lower(Proposal.client_name) == func.lower(current.client_name),
            Proposal.id != proposal_id,
        )
        .order_by(Proposal.submission_deadline.desc().nullslast(), Proposal.created_at.desc())
    )
    return result.scalars().all()


@router.get("/outreach/all", response_model=List[ClientOutreachOut])
async def list_all_client_outreach(
    proposal_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Proposal).where(Proposal.id == proposal_id))
    current = result.scalar_one_or_none()
    if not current:
        raise HTTPException(404, "Proposal not found")
    if not current.client_name:
        return []

    prop_result = await db.execute(
        select(Proposal.id).where(
            func.lower(Proposal.client_name) == func.lower(current.client_name)
        )
    )
    proposal_ids = [row[0] for row in prop_result.all()]

    result = await db.execute(
        select(ClientOutreach)
        .where(ClientOutreach.proposal_id.in_(proposal_ids))
        .order_by(ClientOutreach.outreach_date.desc())
    )
    return result.scalars().all()


@router.get("/outreach", response_model=List[ClientOutreachOut])
async def list_outreach(
    proposal_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ClientOutreach)
        .where(ClientOutreach.proposal_id == proposal_id)
        .order_by(ClientOutreach.outreach_date.desc())
    )
    return result.scalars().all()


@router.post("/outreach", response_model=ClientOutreachOut, status_code=201)
async def create_outreach(
    proposal_id: UUID,
    body: ClientOutreachCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    o = ClientOutreach(
        proposal_id=proposal_id,
        updated_by=user.id,
        **body.model_dump(),
    )
    db.add(o)
    await db.commit()
    await db.refresh(o)
    return o


@router.patch("/outreach/{outreach_id}", response_model=ClientOutreachOut)
async def update_outreach(
    proposal_id: UUID,
    outreach_id: UUID,
    body: ClientOutreachUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ClientOutreach).where(
            ClientOutreach.id == outreach_id,
            ClientOutreach.proposal_id == proposal_id,
        )
    )
    o = result.scalar_one_or_none()
    if not o:
        raise HTTPException(404, "Outreach record not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(o, field, value)
    o.updated_by = user.id
    await db.commit()
    await db.refresh(o)
    return o


@router.delete("/outreach/{outreach_id}", status_code=204)
async def delete_outreach(
    proposal_id: UUID,
    outreach_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ClientOutreach).where(
            ClientOutreach.id == outreach_id,
            ClientOutreach.proposal_id == proposal_id,
        )
    )
    o = result.scalar_one_or_none()
    if not o:
        raise HTTPException(404, "Outreach record not found")
    await db.delete(o)
    await db.commit()
