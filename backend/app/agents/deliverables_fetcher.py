"""
Deliverables Fetcher Agent — mock implementation for PoC.

In production this would call an LLM agent to analyze the RFP document and
extract required deliverables with their types and WBS linkages.
For the PoC demo we return plausible mock data after a delay.
"""
import uuid
import time
from datetime import datetime, timezone

_jobs: dict[str, dict] = {}

MOCK_DELIVERABLES = [
    {
        "deliverable_ref": "D-001",
        "title": "Preliminary Design Report",
        "type": "report",
        "description": "Comprehensive report documenting preliminary design findings, alternatives analysis, and recommended design approach for the Highway 401 widening.",
        "responsible_party": "Tom Fitzgerald",
    },
    {
        "deliverable_ref": "D-002",
        "title": "Environmental Compliance Report",
        "type": "report",
        "description": "Environmental assessment documenting potential impacts, mitigation measures, and regulatory compliance for the widening project.",
        "responsible_party": "Priya Nair",
    },
    {
        "deliverable_ref": "D-003",
        "title": "Traffic Impact Assessment",
        "type": "report",
        "description": "Traffic analysis report including existing conditions, future projections, and intersection/interchange capacity analysis.",
        "responsible_party": "Tom Fitzgerald",
    },
    {
        "deliverable_ref": "D-004",
        "title": "30% Design Drawings",
        "type": "drawing_package",
        "description": "Preliminary design drawings at 30% completion showing general arrangement, alignments, and key design features.",
        "responsible_party": "Tom Fitzgerald",
    },
    {
        "deliverable_ref": "D-005",
        "title": "60% Design Drawings",
        "type": "drawing_package",
        "description": "Semi-final design drawings at 60% completion with detailed cross sections, grading, drainage, and structural details.",
        "responsible_party": "Tom Fitzgerald",
    },
    {
        "deliverable_ref": "D-006",
        "title": "100% Design Drawings",
        "type": "drawing_package",
        "description": "Final construction-ready drawings including all disciplines, details, and quantities for tender.",
        "responsible_party": "Tom Fitzgerald",
    },
    {
        "deliverable_ref": "D-007",
        "title": "Specifications & Special Provisions",
        "type": "specification",
        "description": "Technical specifications and special provisions for construction, supplementing MTO standard specifications.",
        "responsible_party": "Sarah Chen",
    },
    {
        "deliverable_ref": "D-008",
        "title": "Contract Documents & Tender Package",
        "type": "other",
        "description": "Complete tender package including contract documents, bid forms, schedule of quantities, and all appendices.",
        "responsible_party": "Sarah Chen",
    },
]


def create_job(proposal_id: str) -> str:
    job_id = str(uuid.uuid4())
    _jobs[job_id] = {
        "job_id": job_id,
        "proposal_id": proposal_id,
        "status": "pending",
        "result": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
    }
    return job_id


def get_job(job_id: str) -> dict | None:
    return _jobs.get(job_id)


def run_job(job_id: str) -> None:
    """Synchronous mock — simulates 2s LLM processing delay."""
    job = _jobs.get(job_id)
    if not job:
        return

    job["status"] = "running"
    time.sleep(2)

    job["status"] = "complete"
    job["result"] = MOCK_DELIVERABLES
    job["completed_at"] = datetime.now(timezone.utc).isoformat()
