"""
Projects Search Agent — mock implementation for PoC.

In production this would search WSP's master project database using semantic
search to find past projects relevant to the current proposal.
For the PoC demo we return plausible mock data after a delay.
"""
import uuid
import time
from datetime import datetime, timezone

_jobs: dict[str, dict] = {}

MOCK_RESULTS = [
    {
        "project_name": "Highway 407 East Extension — Phases 1 & 2",
        "client": "407 East Development Group",
        "contract_value": 5600000,
        "year_completed": "2019",
        "location": "Durham Region, ON",
        "wsp_role": "Sub-Consultant",
        "services_performed": "Detailed highway design for 22km extension including interchange design, grading, drainage, and ITS systems.",
        "relevance_notes": "Similar highway extension scope with interchange design. Demonstrates WSP capability on large-scale 400-series highway projects.",
    },
    {
        "project_name": "Highway 427 Extension — Vaughan to Bolton",
        "client": "MTO",
        "contract_value": 3200000,
        "year_completed": "2022",
        "location": "Peel Region, ON",
        "wsp_role": "Prime Consultant",
        "services_performed": "Preliminary and detailed design for 6.6km highway extension with 2 interchanges, environmental assessment, and utility coordination.",
        "relevance_notes": "MTO highway extension with similar scope. Same client relationship and procurement process.",
    },
    {
        "project_name": "QEW Garden City Skyway Replacement",
        "client": "MTO",
        "contract_value": 7800000,
        "year_completed": "Ongoing",
        "location": "St. Catharines, ON",
        "wsp_role": "Prime Consultant",
        "services_performed": "Design of replacement bridge and approach roadways, traffic management during construction, and environmental compliance monitoring.",
        "relevance_notes": "Major MTO infrastructure project with bridge component. Demonstrates current MTO relationship and active project delivery.",
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
    """Synchronous mock — simulates 2s database search delay."""
    job = _jobs.get(job_id)
    if not job:
        return

    job["status"] = "running"
    time.sleep(2)

    job["status"] = "complete"
    job["result"] = MOCK_RESULTS
    job["completed_at"] = datetime.now(timezone.utc).isoformat()
