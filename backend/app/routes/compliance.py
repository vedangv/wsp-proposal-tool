from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.session import get_db
from app.auth.deps import get_current_user
from app.models.user import User
from app.models.compliance import ComplianceItem
from app.schemas.compliance import ComplianceCreate, ComplianceUpdate, ComplianceOut, DEFAULT_COMPLIANCE_ITEMS

router = APIRouter(prefix="/api/proposals/{proposal_id}/compliance", tags=["compliance"])


@router.get("/", response_model=List[ComplianceOut])
async def list_compliance(
    proposal_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ComplianceItem)
        .where(ComplianceItem.proposal_id == proposal_id)
        .order_by(ComplianceItem.category, ComplianceItem.order_index)
    )
    return result.scalars().all()


@router.post("/", response_model=ComplianceOut, status_code=201)
async def create_compliance(
    proposal_id: UUID,
    body: ComplianceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = ComplianceItem(
        **body.model_dump(),
        proposal_id=proposal_id,
        updated_by=current_user.name,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.post("/init", response_model=List[ComplianceOut])
async def init_compliance(
    proposal_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Initialize proposal with default compliance items."""
    result = await db.execute(
        select(ComplianceItem).where(ComplianceItem.proposal_id == proposal_id)
    )
    existing = result.scalars().all()
    if existing:
        return existing

    items = []
    for i, default in enumerate(DEFAULT_COMPLIANCE_ITEMS):
        item = ComplianceItem(
            proposal_id=proposal_id,
            item_name=default["item_name"],
            category=default["category"],
            order_index=i,
            updated_by=current_user.name,
        )
        db.add(item)
        items.append(item)
    await db.commit()
    for item in items:
        await db.refresh(item)
    return items


@router.patch("/{item_id}", response_model=ComplianceOut)
async def update_compliance(
    proposal_id: UUID,
    item_id: UUID,
    body: ComplianceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ComplianceItem).where(
            ComplianceItem.id == item_id,
            ComplianceItem.proposal_id == proposal_id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Compliance item not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(item, field, value)
    item.updated_by = current_user.name
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
async def delete_compliance(
    proposal_id: UUID,
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ComplianceItem).where(
            ComplianceItem.id == item_id,
            ComplianceItem.proposal_id == proposal_id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Compliance item not found")
    await db.delete(item)
    await db.commit()
