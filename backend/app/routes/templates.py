from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.proposal_template import ProposalTemplate
from app.models.proposal import Proposal
from app.models.wbs import WBSItem
from app.models.user import User
from app.schemas.proposal_template import ProposalTemplateOut, CreateFromTemplate
from app.schemas.proposal import ProposalOut
from app.auth.deps import get_current_user
from typing import List

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.get("/", response_model=List[ProposalTemplateOut])
async def list_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(ProposalTemplate).order_by(ProposalTemplate.name))
    return result.scalars().all()


@router.post("/create-proposal", response_model=ProposalOut, status_code=201)
async def create_proposal_from_template(
    body: CreateFromTemplate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ProposalTemplate).where(ProposalTemplate.id == body.template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    data = template.template_data or {}

    proposal = Proposal(
        proposal_number=body.proposal_number,
        title=body.title,
        client_name=body.client_name,
        phases=data.get("phases") or None,
        target_dlm=data.get("target_dlm", 3.0),
        created_by=current_user.id,
    )
    db.add(proposal)
    await db.flush()

    wbs_items = data.get("wbs_items", [])
    for i, item in enumerate(wbs_items):
        db.add(WBSItem(
            proposal_id=proposal.id,
            wbs_code=item.get("wbs_code", str(i + 1)),
            description=item.get("description", ""),
            phase=item.get("phase", ""),
            order_index=i,
        ))

    await db.commit()
    await db.refresh(proposal)
    return proposal
