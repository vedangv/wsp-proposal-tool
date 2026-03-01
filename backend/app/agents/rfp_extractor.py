"""
RFP Extractor Agent — mock implementation for PoC.

In production this would call an LLM agent to parse the uploaded RFP document
and extract scope sections, requirements, deliverables, etc.
For the PoC demo we return plausible mock data matching the Highway 401 project.

The agent pattern (async job with polling) is preserved exactly as it would be
in the real implementation so the contract is production-ready.
"""
import uuid
import time
from datetime import datetime, timezone

_jobs: dict[str, dict] = {}

MOCK_SCOPE_SECTIONS = [
    {
        "section_name": "Project Description",
        "content": (
            "The Ontario Ministry of Transportation requires engineering consulting services "
            "for the widening of Highway 401 through the Mississauga section, from Hurontario "
            "Street to Highway 403 interchange. The project involves adding one lane in each "
            "direction (6 to 8 lanes), including associated bridge modifications, drainage "
            "improvements, and noise barrier installations."
        ),
    },
    {
        "section_name": "Scope of Work",
        "content": (
            "The consultant shall provide the following services:\n"
            "- Preliminary and detailed design for highway widening\n"
            "- Structural assessment and design for 3 bridge modifications\n"
            "- Stormwater management design and environmental compliance\n"
            "- Traffic management plan during construction\n"
            "- Utility coordination with regional utilities\n"
            "- Geotechnical investigation and pavement design\n"
            "- Preparation of tender documents and construction support"
        ),
    },
    {
        "section_name": "Deliverables Required",
        "content": (
            "The following deliverables are expected:\n"
            "1. Preliminary Design Report (PDR)\n"
            "2. Environmental Compliance Report\n"
            "3. Traffic Impact Assessment\n"
            "4. 30%, 60%, and 100% Design Drawings\n"
            "5. Specifications and Special Provisions\n"
            "6. Contract Documents and Tender Package"
        ),
    },
    {
        "section_name": "Submission Requirements",
        "content": (
            "Proposals must include:\n"
            "- Firm profile and relevant experience\n"
            "- Key personnel qualifications and CVs\n"
            "- Detailed work plan and schedule\n"
            "- Fee proposal with hourly rates and level of effort\n"
            "- Three references from similar highway widening projects\n"
            "- Proof of insurance ($5M professional liability)"
        ),
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
    time.sleep(2)  # Simulate LLM processing

    job["status"] = "complete"
    job["result"] = MOCK_SCOPE_SECTIONS
    job["completed_at"] = datetime.now(timezone.utc).isoformat()
