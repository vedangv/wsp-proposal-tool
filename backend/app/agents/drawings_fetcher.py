"""
Drawings Fetcher Agent — mock implementation for PoC.

In production this would call an LLM agent to analyze the RFP requirements and
the WBS to generate an expected drawing list for the project.
For the PoC demo we return plausible mock data after a delay.
"""
import uuid
import time
from datetime import datetime, timezone

_jobs: dict[str, dict] = {}

MOCK_DRAWINGS = [
    {
        "drawing_number": "DWG-001",
        "title": "General Arrangement Plan",
        "discipline": "Civil",
        "scale": "1:2000",
        "format": "dwg",
        "responsible_party": "Tom Fitzgerald",
    },
    {
        "drawing_number": "DWG-002",
        "title": "Horizontal Alignment — STA 0+000 to 2+500",
        "discipline": "Civil",
        "scale": "1:1000",
        "format": "dwg",
        "responsible_party": "Tom Fitzgerald",
    },
    {
        "drawing_number": "DWG-003",
        "title": "Typical Cross Sections",
        "discipline": "Civil",
        "scale": "1:50",
        "format": "dwg",
        "responsible_party": "Tom Fitzgerald",
    },
    {
        "drawing_number": "DWG-004",
        "title": "Pavement Structure Details",
        "discipline": "Civil",
        "scale": "1:20",
        "format": "dwg",
        "responsible_party": "Anika Sharma",
    },
    {
        "drawing_number": "DWG-005",
        "title": "Drainage Plan & Profile",
        "discipline": "Civil",
        "scale": "1:1000",
        "format": "dwg",
        "responsible_party": "Priya Nair",
    },
    {
        "drawing_number": "DWG-006",
        "title": "Bridge General Arrangement",
        "discipline": "Structural",
        "scale": "1:200",
        "format": "dwg",
        "responsible_party": "James Okafor",
    },
    {
        "drawing_number": "DWG-007",
        "title": "Traffic Staging Plan — Phase 1",
        "discipline": "Civil",
        "scale": "1:2000",
        "format": "dwg",
        "responsible_party": "Tom Fitzgerald",
    },
    {
        "drawing_number": "DWG-008",
        "title": "Signage & Pavement Markings",
        "discipline": "Civil",
        "scale": "1:1000",
        "format": "dwg",
        "responsible_party": "Anika Sharma",
    },
    {
        "drawing_number": "DWG-009",
        "title": "Environmental Constraints Map",
        "discipline": "Environmental",
        "scale": "1:5000",
        "format": "pdf",
        "responsible_party": "Priya Nair",
    },
    {
        "drawing_number": "DWG-010",
        "title": "Topographic Survey Base Plan",
        "discipline": "Survey",
        "scale": "1:1000",
        "format": "dwg",
        "responsible_party": "Tom Fitzgerald",
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
    job["result"] = MOCK_DRAWINGS
    job["completed_at"] = datetime.now(timezone.utc).isoformat()
