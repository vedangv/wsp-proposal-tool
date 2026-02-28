"""
CV Fetcher Agent — mock implementation for PoC.

In production this would call an internal HR system (Oracle HCM) or SharePoint
to fetch real employee CVs. For the PoC demo we return plausible mock data
so leadership can see the end-to-end flow without needing API credentials.

The agent pattern (async job with polling) is preserved exactly as it would be
in the real implementation so the contract is production-ready.
"""
import uuid
import random
from datetime import datetime, timezone

# In-memory job store.  Replace with Redis or DB in production.
_jobs: dict[str, dict] = {}

MOCK_CVS: list[dict] = [
    {
        "employee_id": "WSP-AU-1042",
        "employee_name": "Sarah Chen",
        "role_on_project": "Project Manager",
        "years_experience": 14,
        "disciplines": ["Water Infrastructure", "Project Management", "Stakeholder Engagement"],
        "education": "B.Eng Civil (Hons), University of Melbourne",
        "summary": (
            "Senior project manager with 14 years' experience delivering major water "
            "infrastructure projects across Australia and South-East Asia. "
            "Certified PMP with expertise in NEC3/4 contract administration."
        ),
        "key_projects": [
            {"name": "Western Desalination Plant Stage 2", "value": "$420M", "role": "PM"},
            {"name": "Sydney Harbour Tunnel Lining Upgrade", "value": "$85M", "role": "Deputy PM"},
        ],
    },
    {
        "employee_id": "WSP-AU-2187",
        "employee_name": "James Okafor",
        "role_on_project": "Lead Structural Engineer",
        "years_experience": 11,
        "disciplines": ["Structural Engineering", "Bridge Design", "Finite Element Analysis"],
        "education": "M.Eng Structural, UNSW Sydney; B.Eng Civil, University of Lagos",
        "summary": (
            "Chartered structural engineer specialising in long-span bridge design and "
            "complex building structures. Experienced in AS 5100, Eurocodes, and AASHTO."
        ),
        "key_projects": [
            {"name": "Gateway Bridge Widening", "value": "$230M", "role": "Lead Structural"},
            {"name": "NorthConnex Tunnel Portal", "value": "$55M", "role": "Structural Designer"},
        ],
    },
    {
        "employee_id": "WSP-AU-3301",
        "employee_name": "Priya Nair",
        "role_on_project": "Environmental Specialist",
        "years_experience": 8,
        "disciplines": ["Environmental Impact Assessment", "Ecology", "Contaminated Land"],
        "education": "B.Sc Environmental Science, ANU; Grad Dip Environmental Law, QUT",
        "summary": (
            "Environmental specialist with expertise in EIA for linear infrastructure, "
            "ecological surveys, and EPBC Act referrals. Strong stakeholder engagement skills."
        ),
        "key_projects": [
            {"name": "Inland Rail — Narrabri to North Star", "value": "$1.1B", "role": "Env Lead"},
            {"name": "Hunter Valley Wind Farm EIS", "value": "$180M", "role": "Env Specialist"},
        ],
    },
    {
        "employee_id": "WSP-AU-4456",
        "employee_name": "Tom Fitzgerald",
        "role_on_project": "Principal Civil Engineer",
        "years_experience": 19,
        "disciplines": ["Roadworks", "Drainage", "Pavement Design", "Traffic Engineering"],
        "education": "B.Eng Civil, University of Queensland; MBA, Macquarie University",
        "summary": (
            "Principal civil engineer with nearly two decades delivering road and highway "
            "projects from concept through to construction. Experienced technical reviewer "
            "and design team leader."
        ),
        "key_projects": [
            {"name": "Bruce Highway Upgrade — Cooroy to Curra", "value": "$950M", "role": "Principal Civil"},
            {"name": "M1 Pacific Motorway Widening", "value": "$320M", "role": "Design Manager"},
        ],
    },
    {
        "employee_id": "WSP-AU-5012",
        "employee_name": "Anika Sharma",
        "role_on_project": "Graduate Engineer",
        "years_experience": 2,
        "disciplines": ["Civil Engineering", "AutoCAD Civil 3D", "Drainage Design"],
        "education": "B.Eng Civil & Environmental (Hons), University of Adelaide",
        "summary": (
            "Motivated graduate engineer with two years' experience in road and drainage "
            "design. Proficient in Civil 3D and DRAINS. Currently completing CPEng application."
        ),
        "key_projects": [
            {"name": "Adelaide CBD Stormwater Upgrade", "value": "$28M", "role": "Graduate Designer"},
        ],
    },
]


def create_job(proposal_id: str, names: list[str]) -> str:
    job_id = str(uuid.uuid4())
    _jobs[job_id] = {
        "job_id": job_id,
        "proposal_id": proposal_id,
        "status": "pending",
        "names": names,
        "result": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
    }
    return job_id


def get_job(job_id: str) -> dict | None:
    return _jobs.get(job_id)


def run_job(job_id: str) -> None:
    """
    Synchronous mock execution — in production this would be a Celery/ARQ task
    that calls HR APIs and optionally an LLM to summarise the CV.
    """
    job = _jobs.get(job_id)
    if not job:
        return

    job["status"] = "running"

    names = job["names"]
    if not names:
        job["status"] = "complete"
        job["result"] = [{**cv, "requested_name": cv["employee_name"]} for cv in MOCK_CVS]
        job["completed_at"] = datetime.now(timezone.utc).isoformat()
        return

    matched = []
    for name in names:
        name_lower = name.lower()
        # Try exact match first, then fuzzy, then pick a random mock CV
        candidate = next(
            (cv for cv in MOCK_CVS if cv["employee_name"].lower() == name_lower),
            None,
        )
        if not candidate:
            candidate = next(
                (cv for cv in MOCK_CVS if any(part in name_lower for part in cv["employee_name"].lower().split())),
                random.choice(MOCK_CVS),
            )
        matched.append({**candidate, "requested_name": name})

    job["status"] = "complete"
    job["result"] = matched
    job["completed_at"] = datetime.now(timezone.utc).isoformat()
