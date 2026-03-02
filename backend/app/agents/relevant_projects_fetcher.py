"""
Relevant Projects Fetcher Agent — mock implementation for PoC.

In production this would call an LLM agent to analyze the RFP requirements and
search WSP's project database for relevant past projects.
For the PoC demo we return plausible mock data after a delay.
"""
import uuid
import time
from datetime import datetime, timezone

_jobs: dict[str, dict] = {}

MOCK_RELEVANT_PROJECTS = [
    {
        "project_name": "Highway 427 Expansion — Phase 2",
        "client": "Ontario Ministry of Transportation (MTO)",
        "contract_value": 5200000,
        "year_completed": "2023",
        "location": "Toronto, ON",
        "wsp_role": "Prime Consultant",
        "project_manager": "Tom Fitzgerald",
        "services_performed": (
            "Detailed design for 6-lane to 8-lane widening over 12km corridor\n"
            "Bridge rehabilitation for 4 overpass structures\n"
            "Stormwater management and environmental compliance\n"
            "Traffic staging and management plan"
        ),
        "relevance_notes": (
            "Directly comparable highway widening project for the same client (MTO). "
            "Similar scope including lane additions, bridge modifications, and drainage improvements. "
            "Key team members Tom Fitzgerald and Sarah Chen were involved."
        ),
    },
    {
        "project_name": "Highway 400 Series Interchange Improvements",
        "client": "Ontario Ministry of Transportation (MTO)",
        "contract_value": 3800000,
        "year_completed": "2022",
        "location": "Greater Toronto Area, ON",
        "wsp_role": "Prime Consultant",
        "project_manager": "Sarah Chen",
        "services_performed": (
            "Interchange geometric design and traffic analysis\n"
            "Structural design for 2 new bridge structures\n"
            "Utility relocation coordination\n"
            "Environmental assessment and permitting"
        ),
        "relevance_notes": (
            "Demonstrates WSP's expertise with MTO interchange and highway projects. "
            "Relevant experience in traffic analysis, structural design, and environmental compliance "
            "within the 400-series highway corridor."
        ),
    },
    {
        "project_name": "Trans-Canada Highway Twinning — Northern Ontario",
        "client": "Ontario Ministry of Transportation (MTO)",
        "contract_value": 8500000,
        "year_completed": "2021",
        "location": "Northern Ontario",
        "wsp_role": "Prime Consultant",
        "project_manager": "Tom Fitzgerald",
        "services_performed": (
            "Preliminary and detailed design for 45km highway twinning\n"
            "Geotechnical investigation in challenging terrain\n"
            "Environmental assessment including species at risk studies\n"
            "Construction administration and inspection services"
        ),
        "relevance_notes": (
            "Large-scale highway capacity improvement project demonstrating WSP's ability to manage "
            "complex multi-discipline projects. Environmental assessment experience directly applicable "
            "to the Highway 401 widening scope."
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
    time.sleep(2)

    job["status"] = "complete"
    job["result"] = MOCK_RELEVANT_PROJECTS
    job["completed_at"] = datetime.now(timezone.utc).isoformat()
