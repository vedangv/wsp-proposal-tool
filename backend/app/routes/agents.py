"""
Agent API — /api/agents/

All agent endpoints are async: POST returns a job_id immediately,
caller polls GET /api/agents/jobs/{job_id} for status + result.

This pattern is preserved for the real implementation where agent calls
may take 10–60 seconds (LLM calls, HR system lookups, document generation).
"""
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.auth.deps import get_current_user
from app.models.user import User
from app.agents import cv_fetcher, rfp_extractor, relevant_projects_fetcher, deliverables_fetcher, drawings_fetcher

router = APIRouter(prefix="/api/agents", tags=["agents"])


class CVFetchRequest(BaseModel):
    proposal_id: str
    names: list[str]


class RFPExtractRequest(BaseModel):
    proposal_id: str


class RelevantProjectsFetchRequest(BaseModel):
    proposal_id: str


class DeliverablesFetchRequest(BaseModel):
    proposal_id: str


class DrawingsFetchRequest(BaseModel):
    proposal_id: str


class JobStatusOut(BaseModel):
    job_id: str
    status: str       # pending | running | complete | error
    result: Optional[list] = None
    created_at: str
    completed_at: Optional[str] = None


@router.post("/cv-fetch", status_code=202)
async def start_cv_fetch(
    body: CVFetchRequest,
    _: User = Depends(get_current_user),
):
    """
    Kick off a CV fetch for one or more employee names.
    Returns job_id immediately; poll /api/agents/jobs/{job_id} for results.
    """
    job_id = cv_fetcher.create_job(body.proposal_id, body.names)
    # Run mock synchronously in a thread pool so the endpoint returns fast
    asyncio.get_event_loop().run_in_executor(None, cv_fetcher.run_job, job_id)
    return {"job_id": job_id, "status": "pending"}


@router.post("/rfp-extract", status_code=202)
async def start_rfp_extract(
    body: RFPExtractRequest,
    _: User = Depends(get_current_user),
):
    """
    Kick off RFP extraction to pull scope sections from an RFP document.
    Returns job_id immediately; poll /api/agents/jobs/{job_id} for results.
    """
    job_id = rfp_extractor.create_job(body.proposal_id)
    asyncio.get_event_loop().run_in_executor(None, rfp_extractor.run_job, job_id)
    return {"job_id": job_id, "status": "pending"}


@router.post("/relevant-projects-fetch", status_code=202)
async def start_relevant_projects_fetch(
    body: RelevantProjectsFetchRequest,
    _: User = Depends(get_current_user),
):
    """
    Kick off relevant projects fetch based on RFP requirements.
    Returns job_id immediately; poll /api/agents/jobs/{job_id} for results.
    """
    job_id = relevant_projects_fetcher.create_job(body.proposal_id)
    asyncio.get_event_loop().run_in_executor(None, relevant_projects_fetcher.run_job, job_id)
    return {"job_id": job_id, "status": "pending"}


@router.post("/deliverables-fetch", status_code=202)
async def start_deliverables_fetch(
    body: DeliverablesFetchRequest,
    _: User = Depends(get_current_user),
):
    """
    Kick off deliverables extraction from RFP document.
    Returns job_id immediately; poll /api/agents/jobs/{job_id} for results.
    """
    job_id = deliverables_fetcher.create_job(body.proposal_id)
    asyncio.get_event_loop().run_in_executor(None, deliverables_fetcher.run_job, job_id)
    return {"job_id": job_id, "status": "pending"}


@router.post("/drawings-fetch", status_code=202)
async def start_drawings_fetch(
    body: DrawingsFetchRequest,
    _: User = Depends(get_current_user),
):
    """
    Kick off drawing list extraction from RFP/WBS.
    Returns job_id immediately; poll /api/agents/jobs/{job_id} for results.
    """
    job_id = drawings_fetcher.create_job(body.proposal_id)
    asyncio.get_event_loop().run_in_executor(None, drawings_fetcher.run_job, job_id)
    return {"job_id": job_id, "status": "pending"}


@router.get("/jobs/{job_id}", response_model=JobStatusOut)
async def get_job_status(
    job_id: str,
    _: User = Depends(get_current_user),
):
    job = cv_fetcher.get_job(job_id) or rfp_extractor.get_job(job_id) or relevant_projects_fetcher.get_job(job_id) or deliverables_fetcher.get_job(job_id) or drawings_fetcher.get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return JobStatusOut(
        job_id=job["job_id"],
        status=job["status"],
        result=job.get("result"),
        created_at=job["created_at"],
        completed_at=job.get("completed_at"),
    )
