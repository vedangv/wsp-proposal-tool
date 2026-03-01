from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.deps import get_current_user
from app.models.people import ProposedPerson
from app.models.pricing import PricingRow
from app.models.user import User
from app.schemas.people import PersonCreate, PersonUpdate, PersonOut

router = APIRouter(prefix="/api/proposals/{proposal_id}/people", tags=["people"])


@router.get("/", response_model=List[PersonOut])
async def list_people(
    proposal_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ProposedPerson)
        .where(ProposedPerson.proposal_id == proposal_id)
        .order_by(ProposedPerson.updated_at)
    )
    return result.scalars().all()


@router.post("/", response_model=PersonOut, status_code=201)
async def create_person(
    proposal_id: UUID,
    body: PersonCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    person = ProposedPerson(
        proposal_id=proposal_id,
        updated_by=user.id,
        **body.model_dump(exclude_unset=True),
    )
    db.add(person)
    await db.commit()
    await db.refresh(person)
    return person


@router.patch("/{person_id}", response_model=PersonOut)
async def update_person(
    proposal_id: UUID,
    person_id: UUID,
    body: PersonUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ProposedPerson).where(
            ProposedPerson.id == person_id, ProposedPerson.proposal_id == proposal_id
        )
    )
    person = result.scalar_one_or_none()
    if not person:
        raise HTTPException(404, "Person not found")

    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(person, field, value)
    person.updated_by = user.id

    # Cascade rate changes to all pricing rows referencing this person
    rate_fields = {"hourly_rate", "cost_rate"}
    if rate_fields & updates.keys():
        pricing_result = await db.execute(
            select(PricingRow).where(PricingRow.person_id == person_id)
        )
        for row in pricing_result.scalars().all():
            if "hourly_rate" in updates:
                row.hourly_rate = person.hourly_rate
            if "cost_rate" in updates:
                row.cost_rate = person.cost_rate

    await db.commit()
    await db.refresh(person)
    return person


@router.delete("/{person_id}", status_code=204)
async def delete_person(
    proposal_id: UUID,
    person_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ProposedPerson).where(
            ProposedPerson.id == person_id, ProposedPerson.proposal_id == proposal_id
        )
    )
    person = result.scalar_one_or_none()
    if not person:
        raise HTTPException(404, "Person not found")
    await db.delete(person)
    await db.commit()
