import uuid
from datetime import date, timedelta
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User, UserRole
from app.models.proposal_template import ProposalTemplate
from app.models.proposal import Proposal, ProposalStatus
from app.models.people import ProposedPerson
from app.models.wbs import WBSItem
from app.models.pricing import PricingRow
from app.models.schedule import ScheduleItem
from app.models.deliverable import Deliverable, DeliverableType, DeliverableStatus
from app.models.scope import ScopeSection
from app.models.discipline import ProposalDiscipline
from app.models.compliance import ComplianceItem

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEMO_USERS = [
    {"name": "Alice PM", "email": "alice@wsp.com", "password": "demo123", "role": UserRole.pm},
    {"name": "Bob Finance", "email": "bob@wsp.com", "password": "demo123", "role": UserRole.finance},
    {"name": "Carol Admin", "email": "carol@wsp.com", "password": "demo123", "role": UserRole.admin},
]

DEMO_TEMPLATES = [
    {
        "name": "Road / Highway Design",
        "description": "Standard WBS for road and highway design projects including study through construction phases.",
        "template_data": {
            "phases": ["Study", "Preliminary", "Detailed", "Tender", "Construction"],
            "target_dlm": 3.0,
            "wbs_items": [
                {"wbs_code": "1", "description": "Project Management", "phase": ""},
                {"wbs_code": "1.1", "description": "Project Controls & Reporting", "phase": ""},
                {"wbs_code": "1.2", "description": "Quality Assurance", "phase": ""},
                {"wbs_code": "2", "description": "Surveys & Investigations", "phase": "Study"},
                {"wbs_code": "2.1", "description": "Topographic Survey", "phase": "Study"},
                {"wbs_code": "2.2", "description": "Geotechnical Investigation", "phase": "Study"},
                {"wbs_code": "3", "description": "Road Design", "phase": "Detailed"},
                {"wbs_code": "3.1", "description": "Horizontal & Vertical Alignment", "phase": "Detailed"},
                {"wbs_code": "3.2", "description": "Cross Sections & Grading", "phase": "Detailed"},
                {"wbs_code": "3.3", "description": "Pavement Design", "phase": "Detailed"},
                {"wbs_code": "4", "description": "Drainage Design", "phase": "Detailed"},
                {"wbs_code": "4.1", "description": "Hydrology & Hydraulics", "phase": "Detailed"},
                {"wbs_code": "4.2", "description": "Stormwater Management", "phase": "Detailed"},
                {"wbs_code": "5", "description": "Traffic Engineering", "phase": "Preliminary"},
                {"wbs_code": "5.1", "description": "Traffic Analysis", "phase": "Preliminary"},
                {"wbs_code": "5.2", "description": "Signage & Markings", "phase": "Detailed"},
                {"wbs_code": "6", "description": "Environmental Assessment", "phase": "Study"},
                {"wbs_code": "7", "description": "Utilities Coordination", "phase": "Detailed"},
                {"wbs_code": "8", "description": "Tender Documents", "phase": "Tender"},
                {"wbs_code": "9", "description": "Construction Support", "phase": "Construction"},
            ],
        },
    },
    {
        "name": "Environmental Assessment",
        "description": "Standard WBS for environmental impact assessments and permitting.",
        "template_data": {
            "phases": ["Screening", "Scoping", "Assessment", "Mitigation", "Reporting"],
            "target_dlm": 2.8,
            "wbs_items": [
                {"wbs_code": "1", "description": "Project Management", "phase": ""},
                {"wbs_code": "2", "description": "Screening & Scoping", "phase": "Screening"},
                {"wbs_code": "2.1", "description": "Regulatory Review", "phase": "Screening"},
                {"wbs_code": "2.2", "description": "Stakeholder Identification", "phase": "Scoping"},
                {"wbs_code": "3", "description": "Baseline Studies", "phase": "Assessment"},
                {"wbs_code": "3.1", "description": "Natural Environment", "phase": "Assessment"},
                {"wbs_code": "3.2", "description": "Socio-Economic Environment", "phase": "Assessment"},
                {"wbs_code": "3.3", "description": "Cultural Heritage", "phase": "Assessment"},
                {"wbs_code": "4", "description": "Impact Assessment", "phase": "Assessment"},
                {"wbs_code": "4.1", "description": "Effects Analysis", "phase": "Assessment"},
                {"wbs_code": "4.2", "description": "Cumulative Effects", "phase": "Assessment"},
                {"wbs_code": "5", "description": "Mitigation & Monitoring", "phase": "Mitigation"},
                {"wbs_code": "6", "description": "Public Consultation", "phase": "Assessment"},
                {"wbs_code": "7", "description": "EA Report & Submission", "phase": "Reporting"},
            ],
        },
    },
    {
        "name": "Bridge / Structure Design",
        "description": "Standard WBS for bridge and structural engineering projects.",
        "template_data": {
            "phases": ["Study", "Preliminary", "Detailed", "Tender", "Construction"],
            "target_dlm": 3.2,
            "wbs_items": [
                {"wbs_code": "1", "description": "Project Management", "phase": ""},
                {"wbs_code": "1.1", "description": "Project Controls", "phase": ""},
                {"wbs_code": "2", "description": "Site Investigation", "phase": "Study"},
                {"wbs_code": "2.1", "description": "Geotechnical Investigation", "phase": "Study"},
                {"wbs_code": "2.2", "description": "Hydrological Study", "phase": "Study"},
                {"wbs_code": "2.3", "description": "Condition Assessment", "phase": "Study"},
                {"wbs_code": "3", "description": "Structural Design", "phase": "Detailed"},
                {"wbs_code": "3.1", "description": "Foundation Design", "phase": "Detailed"},
                {"wbs_code": "3.2", "description": "Substructure Design", "phase": "Detailed"},
                {"wbs_code": "3.3", "description": "Superstructure Design", "phase": "Detailed"},
                {"wbs_code": "3.4", "description": "Bearing & Expansion Joints", "phase": "Detailed"},
                {"wbs_code": "4", "description": "Approach Works", "phase": "Detailed"},
                {"wbs_code": "5", "description": "Load Rating & Analysis", "phase": "Preliminary"},
                {"wbs_code": "6", "description": "Drawings & Specifications", "phase": "Tender"},
                {"wbs_code": "7", "description": "Construction Support", "phase": "Construction"},
                {"wbs_code": "7.1", "description": "Shop Drawing Review", "phase": "Construction"},
                {"wbs_code": "7.2", "description": "Site Inspections", "phase": "Construction"},
            ],
        },
    },
]


async def seed_users(db: AsyncSession):
    for user_data in DEMO_USERS:
        result = await db.execute(select(User).where(User.email == user_data["email"]))
        if result.scalar_one_or_none():
            continue
        user = User(
            name=user_data["name"],
            email=user_data["email"],
            role=user_data["role"],
            password_hash=pwd_context.hash(user_data["password"]),
        )
        db.add(user)
    await db.commit()


async def seed_templates(db: AsyncSession):
    for tmpl in DEMO_TEMPLATES:
        result = await db.execute(
            select(ProposalTemplate).where(ProposalTemplate.name == tmpl["name"])
        )
        if result.scalar_one_or_none():
            continue
        db.add(ProposalTemplate(
            name=tmpl["name"],
            description=tmpl["description"],
            template_data=tmpl["template_data"],
        ))
    await db.commit()


async def seed_demo_proposal(db: AsyncSession):
    """Seed the Highway 401 demo proposal with full data. Idempotent by proposal_number."""
    result = await db.execute(
        select(Proposal).where(Proposal.proposal_number == "P-2024-0401")
    )
    if result.scalar_one_or_none():
        return  # Already seeded

    # Get Alice (PM) as created_by
    alice_result = await db.execute(select(User).where(User.email == "alice@wsp.com"))
    alice = alice_result.scalar_one_or_none()
    alice_id = alice.id if alice else None

    today = date.today()

    # --- Proposal ---
    proposal_id = uuid.uuid4()
    proposal = Proposal(
        id=proposal_id,
        proposal_number="P-2024-0401",
        title="Highway 401 Widening — Mississauga Section",
        client_name="Ontario Ministry of Transportation (MTO)",
        status=ProposalStatus.draft,
        target_dlm=3.0,
        phases=["Study", "Preliminary", "Detailed", "Tender", "Construction"],
        kickoff_date=today,
        red_review_date=today + timedelta(days=7),
        gold_review_date=today + timedelta(days=10),
        submission_deadline=today + timedelta(days=14),
        check_in_meetings=[
            {"date": (today + timedelta(days=3)).isoformat(), "notes": "Scope alignment & team roles"},
            {"date": (today + timedelta(days=8)).isoformat(), "notes": "Post red-review corrections"},
        ],
        created_by=alice_id,
    )
    db.add(proposal)
    await db.flush()  # Flush so proposal FK is available for child records

    # --- People ---
    people_data = [
        {"name": "Sarah Chen", "role": "Project Manager", "team": "PM", "wsp_role": "Senior PM",
         "cost": 85, "burdened": 115, "hourly": 245, "years": 14},
        {"name": "James Okafor", "role": "Structural Lead", "team": "Structures", "wsp_role": "Senior Structural Engineer",
         "cost": 75, "burdened": 102, "hourly": 225, "years": 11},
        {"name": "Tom Fitzgerald", "role": "Highway Design Lead", "team": "Transportation", "wsp_role": "Principal Engineer",
         "cost": 90, "burdened": 122, "hourly": 265, "years": 19},
        {"name": "Priya Nair", "role": "Environmental Specialist", "team": "Environment", "wsp_role": "Environmental Scientist",
         "cost": 65, "burdened": 88, "hourly": 195, "years": 8},
        {"name": "Anika Sharma", "role": "Graduate Engineer", "team": "Transportation", "wsp_role": "EIT",
         "cost": 42, "burdened": 57, "hourly": 125, "years": 2},
    ]
    person_ids = {}
    for p in people_data:
        pid = uuid.uuid4()
        person_ids[p["name"]] = pid
        db.add(ProposedPerson(
            id=pid,
            proposal_id=proposal_id,
            employee_name=p["name"],
            role_on_project=p["role"],
            team=p["team"],
            wsp_role=p["wsp_role"],
            cost_rate=p["cost"],
            burdened_rate=p["burdened"],
            hourly_rate=p["hourly"],
            years_experience=p["years"],
        ))

    await db.flush()  # Flush people so person FKs are available

    # --- WBS Items (20 items from Road/Highway template) ---
    wbs_data = [
        ("1", "Project Management", ""),
        ("1.1", "Project Controls & Reporting", ""),
        ("1.2", "Quality Assurance", ""),
        ("2", "Surveys & Investigations", "Study"),
        ("2.1", "Topographic Survey", "Study"),
        ("2.2", "Geotechnical Investigation", "Study"),
        ("3", "Road Design", "Detailed"),
        ("3.1", "Horizontal & Vertical Alignment", "Detailed"),
        ("3.2", "Cross Sections & Grading", "Detailed"),
        ("3.3", "Pavement Design", "Detailed"),
        ("4", "Drainage Design", "Detailed"),
        ("4.1", "Hydrology & Hydraulics", "Detailed"),
        ("4.2", "Stormwater Management", "Detailed"),
        ("5", "Traffic Engineering", "Preliminary"),
        ("5.1", "Traffic Analysis", "Preliminary"),
        ("5.2", "Signage & Markings", "Detailed"),
        ("6", "Environmental Assessment", "Study"),
        ("7", "Utilities Coordination", "Detailed"),
        ("8", "Tender Documents", "Tender"),
        ("9", "Construction Support", "Construction"),
    ]
    wbs_ids = {}
    for idx, (code, desc, phase) in enumerate(wbs_data):
        wid = uuid.uuid4()
        wbs_ids[code] = wid
        db.add(WBSItem(
            id=wid,
            proposal_id=proposal_id,
            wbs_code=code,
            description=desc,
            phase=phase,
            order_index=idx,
        ))

    await db.flush()  # Flush WBS items so wbs FKs are available

    # --- Pricing Rows (~2000 hours across team and WBS leaf nodes) ---
    # Only leaf WBS items get pricing rows
    leaf_codes = ["1.1", "1.2", "2.1", "2.2", "3.1", "3.2", "3.3", "4.1", "4.2", "5.1", "5.2", "6", "7", "8", "9"]
    # hours_by_phase maps: {phase: hours}
    # Distribute hours realistically per person per WBS item
    pricing_assignments = [
        # (person, wbs_code, {phase: hours})
        # Sarah Chen — PM, mostly management + some per phase
        ("Sarah Chen", "1.1", {"Study": 24, "Preliminary": 24, "Detailed": 48, "Tender": 16, "Construction": 16}),
        ("Sarah Chen", "1.2", {"Study": 12, "Preliminary": 12, "Detailed": 20, "Tender": 8, "Construction": 8}),
        ("Sarah Chen", "8", {"Tender": 32}),
        ("Sarah Chen", "9", {"Construction": 24}),
        # Tom Fitzgerald — Highway Design Lead
        ("Tom Fitzgerald", "2.1", {"Study": 16}),
        ("Tom Fitzgerald", "3.1", {"Detailed": 120}),
        ("Tom Fitzgerald", "3.2", {"Detailed": 80}),
        ("Tom Fitzgerald", "3.3", {"Detailed": 60}),
        ("Tom Fitzgerald", "5.1", {"Preliminary": 40}),
        ("Tom Fitzgerald", "5.2", {"Detailed": 32}),
        ("Tom Fitzgerald", "7", {"Detailed": 24}),
        ("Tom Fitzgerald", "8", {"Tender": 40}),
        ("Tom Fitzgerald", "9", {"Construction": 60}),
        # James Okafor — Structural
        ("James Okafor", "2.2", {"Study": 48}),
        ("James Okafor", "3.1", {"Detailed": 80}),
        ("James Okafor", "3.2", {"Detailed": 56}),
        ("James Okafor", "7", {"Detailed": 24}),
        ("James Okafor", "8", {"Tender": 40}),
        ("James Okafor", "9", {"Construction": 96}),
        # Priya Nair — Environmental
        ("Priya Nair", "2.1", {"Study": 24}),
        ("Priya Nair", "2.2", {"Study": 16}),
        ("Priya Nair", "4.1", {"Detailed": 60}),
        ("Priya Nair", "4.2", {"Detailed": 80}),
        ("Priya Nair", "6", {"Study": 140}),
        ("Priya Nair", "9", {"Construction": 24}),
        # Anika Sharma — Graduate, supporting multiple leads
        ("Anika Sharma", "2.1", {"Study": 40}),
        ("Anika Sharma", "2.2", {"Study": 24}),
        ("Anika Sharma", "3.1", {"Detailed": 80}),
        ("Anika Sharma", "3.2", {"Detailed": 60}),
        ("Anika Sharma", "3.3", {"Detailed": 40}),
        ("Anika Sharma", "4.1", {"Detailed": 40}),
        ("Anika Sharma", "4.2", {"Detailed": 48}),
        ("Anika Sharma", "5.2", {"Detailed": 24}),
        ("Anika Sharma", "6", {"Study": 40}),
        ("Anika Sharma", "7", {"Detailed": 32}),
        ("Anika Sharma", "8", {"Tender": 60}),
        ("Anika Sharma", "9", {"Construction": 40}),
    ]
    for person_name, wbs_code, hours in pricing_assignments:
        db.add(PricingRow(
            proposal_id=proposal_id,
            wbs_id=wbs_ids[wbs_code],
            person_id=person_ids[person_name],
            hourly_rate=next(p["hourly"] for p in people_data if p["name"] == person_name),
            cost_rate=next(p["cost"] for p in people_data if p["name"] == person_name),
            hours_by_phase=hours,
        ))

    # --- Schedule Items (8 items + 2 milestones, ~90 day span) ---
    schedule_data = [
        ("Topographic Survey", "2.1", today, today + timedelta(days=14), "Tom Fitzgerald", False, "Study"),
        ("Geotechnical Investigation", "2.2", today + timedelta(days=7), today + timedelta(days=28), "James Okafor", False, "Study"),
        ("Environmental Assessment", "6", today, today + timedelta(days=35), "Priya Nair", False, "Study"),
        ("Study Phase Complete", None, None, today + timedelta(days=35), None, True, "Study"),
        ("Traffic Analysis", "5.1", today + timedelta(days=21), today + timedelta(days=42), "Tom Fitzgerald", False, "Preliminary"),
        ("Highway Design", "3.1", today + timedelta(days=35), today + timedelta(days=63), "Tom Fitzgerald", False, "Detailed"),
        ("Drainage Design", "4.1", today + timedelta(days=42), today + timedelta(days=63), "Priya Nair", False, "Detailed"),
        ("Utilities Coordination", "7", today + timedelta(days=49), today + timedelta(days=70), "Tom Fitzgerald", False, "Detailed"),
        ("Design Freeze", None, None, today + timedelta(days=70), None, True, "Detailed"),
        ("Tender Package Preparation", "8", today + timedelta(days=70), today + timedelta(days=90), "Sarah Chen", False, "Tender"),
    ]
    for task_name, wbs_code, start, end, resp, milestone, phase in schedule_data:
        db.add(ScheduleItem(
            proposal_id=proposal_id,
            wbs_id=wbs_ids.get(wbs_code) if wbs_code else None,
            task_name=task_name,
            start_date=start if not milestone else end,
            end_date=end,
            responsible_party=resp,
            is_milestone=milestone,
            phase=phase,
        ))

    # --- Deliverables (8 items) ---
    deliverable_data = [
        ("D-001", "Preliminary Design Report", DeliverableType.report, "3.1", "Tom Fitzgerald", DeliverableStatus.in_progress),
        ("D-002", "Environmental Compliance Report", DeliverableType.report, "6", "Priya Nair", DeliverableStatus.tbd),
        ("D-003", "Traffic Impact Assessment", DeliverableType.report, "5.1", "Tom Fitzgerald", DeliverableStatus.tbd),
        ("D-004", "30% Design Drawings", DeliverableType.drawing_package, "3.2", "Tom Fitzgerald", DeliverableStatus.tbd),
        ("D-005", "60% Design Drawings", DeliverableType.drawing_package, "3.2", "Tom Fitzgerald", DeliverableStatus.tbd),
        ("D-006", "100% Design Drawings", DeliverableType.drawing_package, "3.2", "Tom Fitzgerald", DeliverableStatus.tbd),
        ("D-007", "Specifications & Special Provisions", DeliverableType.specification, "8", "Sarah Chen", DeliverableStatus.tbd),
        ("D-008", "Contract Documents & Tender Package", DeliverableType.other, "8", "Sarah Chen", DeliverableStatus.tbd),
    ]
    for ref, title, dtype, wbs_code, resp, status in deliverable_data:
        db.add(Deliverable(
            proposal_id=proposal_id,
            wbs_id=wbs_ids.get(wbs_code),
            deliverable_ref=ref,
            title=title,
            type=dtype,
            responsible_party=resp,
            status=status,
        ))

    # --- Scope Sections (3 sections) ---
    scope_data = [
        ("Project Description",
         "The Ontario Ministry of Transportation requires engineering consulting services "
         "for the widening of Highway 401 through the Mississauga section, from Hurontario "
         "Street to Highway 403 interchange. The project involves adding one lane in each "
         "direction (6 to 8 lanes), including associated bridge modifications, drainage "
         "improvements, and noise barrier installations.",
         0),
        ("Scope of Work",
         "The consultant shall provide the following services:\n"
         "- Preliminary and detailed design for highway widening\n"
         "- Structural assessment and design for 3 bridge modifications\n"
         "- Stormwater management design and environmental compliance\n"
         "- Traffic management plan during construction\n"
         "- Utility coordination with regional utilities\n"
         "- Geotechnical investigation and pavement design\n"
         "- Preparation of tender documents and construction support",
         1),
        ("Deliverables Required",
         "The following deliverables are expected:\n"
         "1. Preliminary Design Report (PDR)\n"
         "2. Environmental Compliance Report\n"
         "3. Traffic Impact Assessment\n"
         "4. 30%, 60%, and 100% Design Drawings\n"
         "5. Specifications and Special Provisions\n"
         "6. Contract Documents and Tender Package",
         2),
    ]
    for name, content, order in scope_data:
        db.add(ScopeSection(
            proposal_id=proposal_id,
            section_name=name,
            content=content,
            order_index=order,
        ))

    # --- Disciplines (5 with contacts and mixed statuses) ---
    discipline_data = [
        ("Transportation", "Tom Fitzgerald", "t.fitzgerald@wsp.com", "416-555-0101", "confirmed", "Lead discipline", 0),
        ("Structural", "James Okafor", "j.okafor@wsp.com", "416-555-0102", "confirmed", "3 bridge modifications", 1),
        ("Environmental", "Priya Nair", "p.nair@wsp.com", "416-555-0103", "confirmed", "", 2),
        ("Geotechnical", "Michael Torres", "m.torres@wsp.com", "416-555-0104", "contacted", "Awaiting availability confirmation", 3),
        ("Electrical", "Lisa Park", "l.park@wsp.com", "", "not_contacted", "ITS & lighting scope TBD", 4),
    ]
    for disc_name, contact, email, phone, status, notes, order in discipline_data:
        db.add(ProposalDiscipline(
            proposal_id=proposal_id,
            discipline_name=disc_name,
            contact_name=contact,
            contact_email=email,
            contact_phone=phone,
            status=status,
            notes=notes,
            order_index=order,
        ))

    # --- Compliance Items (defaults with 3 completed, 1 in_progress) ---
    compliance_data = [
        ("Insurance ($5M Professional Liability)", "Financial", "completed", "Sarah Chen", 0),
        ("Bonding Capacity", "Financial", "completed", "Sarah Chen", 1),
        ("Conflict of Interest Declaration", "Legal", "completed", "Sarah Chen", 2),
        ("Teaming Agreements", "Legal", "in_progress", "Sarah Chen", 3),
        ("Subconsultant Letters of Intent", "Legal", "pending", "", 4),
        ("Certificate of Good Standing", "Administrative", "pending", "", 5),
        ("Security Clearance (if required)", "Administrative", "not_applicable", "", 6),
        ("AODA Compliance", "Technical", "pending", "", 7),
    ]
    for item_name, category, status, assigned, order in compliance_data:
        db.add(ComplianceItem(
            proposal_id=proposal_id,
            item_name=item_name,
            category=category,
            status=status,
            assigned_to=assigned,
            order_index=order,
        ))

    await db.commit()
